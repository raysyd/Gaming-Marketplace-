import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Seller-initiated refund. Since /api/checkout charges the platform
 * directly and captures immediately (separate charges and transfers —
 * see the comment there), the money is always actually sitting
 * somewhere real, never just an uncaptured authorization:
 *  - status "paid"/"shipped"/"delivered" (charged, still in the
 *    platform's own balance, never transferred) -> refund the charge.
 *  - status "released" (already transferred to the seller's connected
 *    account by /api/orders/[id]/release) -> reverse that specific
 *    transfer first to claw the money back from the connected account,
 *    then refund the original charge.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimit(`order-refund:${clientKey(req)}`, { limit: 10 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const { id } = await params;

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, seller_id, status, stripe_payment_intent, stripe_transfer_id")
    .eq("id", id)
    .single();
  if (error || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.seller_id !== user.id)
    return NextResponse.json({ error: "Only the seller can refund this order." }, { status: 403 });
  if (!["paid", "shipped", "delivered", "released"].includes(order.status))
    return NextResponse.json(
      { error: `Can't refund an order in "${order.status}" status.` },
      { status: 400 }
    );
  if (!order.stripe_payment_intent)
    return NextResponse.json({ error: "Order has no payment on file." }, { status: 400 });

  const stripe = await getStripe();
  if (!stripe) return NextResponse.json({ error: "Payments aren't connected." }, { status: 500 });

  try {
    if (order.status === "released") {
      if (!order.stripe_transfer_id)
        throw new Error("Order is marked released but has no transfer on file to reverse.");
      // Order matters: claw back from the connected account first, then
      // refund the buyer — reversing the transfer that's no longer
      // backed by an active refund would be the wrong failure mode to
      // risk if the second call fails.
      await stripe.transfers.createReversal(order.stripe_transfer_id);
    }
    await stripe.refunds.create({ payment_intent: order.stripe_payment_intent });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Refund failed." },
      { status: 500 }
    );
  }

  const admin = createAdminClient();
  if (!admin)
    return NextResponse.json({ error: "Server isn't configured for this write." }, { status: 500 });

  const { error: updateError } = await admin
    .from("orders")
    .update({ status: "refunded" })
    .eq("id", id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

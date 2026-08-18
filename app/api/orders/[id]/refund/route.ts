import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Seller-initiated refund. Two different Stripe calls depending on
 * whether the money ever actually left the platform:
 *  - status "paid"/"shipped"/"delivered" (authorised, never captured) ->
 *    cancel the PaymentIntent. Releases the hold, nothing to reverse.
 *  - status "released" (captured + already auto-transferred to the
 *    seller) -> a real refund with reverse_transfer so it's clawed back
 *    from the connected account, not just the platform's balance.
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
    .select("id, seller_id, status, stripe_payment_intent")
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
      await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent,
        reverse_transfer: true,
      });
    } else {
      await stripe.paymentIntents.cancel(order.stripe_payment_intent);
    }
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

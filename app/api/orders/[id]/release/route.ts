import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Buyer confirms delivery -> transfer the seller's cut out of the
 * platform's own Stripe balance. /api/checkout charges the platform
 * directly (separate charges and transfers, not a destination charge —
 * see the comment there for why), so nothing was auto-transferred at
 * payment time; this is the one explicit stripe.transfers.create() call
 * that actually pays the seller.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimit(`order-release:${clientKey(req)}`, { limit: 10 });
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

  // Read through the user's own session — RLS's "order parties read"
  // policy is what actually proves this user is allowed to see this row.
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, buyer_id, seller_id, status, amount, platform_fee, stripe_payment_intent")
    .eq("id", id)
    .single();
  if (error || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.buyer_id !== user.id)
    return NextResponse.json({ error: "Only the buyer can release payment." }, { status: 403 });
  if (!["paid", "shipped", "delivered"].includes(order.status))
    return NextResponse.json(
      { error: `Can't release an order in "${order.status}" status.` },
      { status: 400 }
    );
  if (!order.stripe_payment_intent)
    return NextResponse.json({ error: "Order has no payment on file." }, { status: 400 });

  const { data: sellerProfile } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", order.seller_id)
    .maybeSingle();
  const destination = sellerProfile?.stripe_account_id as string | undefined;
  if (!destination)
    return NextResponse.json({ error: "Seller has no payout account on file." }, { status: 400 });

  const stripe = await getStripe();
  if (!stripe) return NextResponse.json({ error: "Payments aren't connected." }, { status: 500 });

  let transferId: string;
  try {
    // source_transaction ties the transfer to the original charge, which
    // is what lets Stripe correctly attribute it if that charge is later
    // disputed. The PaymentIntent has to be retrieved to get the charge
    // id — a Checkout Session's payment_intent field is just the id, not
    // the expanded object with latest_charge on it.
    const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent);
    const chargeId =
      typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
    if (!chargeId) throw new Error("This payment has no completed charge to transfer from.");

    const transferAmount = Math.round((Number(order.amount) - Number(order.platform_fee)) * 100);
    const transfer = await stripe.transfers.create({
      amount: transferAmount,
      currency: "aud",
      destination,
      source_transaction: chargeId,
      metadata: { orderId: id },
    });
    transferId = transfer.id;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Transfer failed." },
      { status: 500 }
    );
  }

  // No UPDATE policy exists on orders (only the SELECT above) — this
  // status flip is the one write that has to go through the admin
  // client, now that the authorization check above has actually passed.
  const admin = createAdminClient();
  if (!admin)
    return NextResponse.json({ error: "Server isn't configured for this write." }, { status: 500 });

  const { error: updateError } = await admin
    .from("orders")
    .update({ status: "released", stripe_transfer_id: transferId })
    .eq("id", id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

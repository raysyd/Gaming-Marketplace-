import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

/**
 * Buyer confirms delivery -> capture the held PaymentIntent. Because the
 * PaymentIntent already carries transfer_data.destination (set at
 * checkout), Stripe auto-transfers the seller's cut to their connected
 * account the moment capture succeeds — no separate Transfer call needed.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    .select("id, buyer_id, status, stripe_payment_intent")
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

  const stripe = await getStripe();
  if (!stripe) return NextResponse.json({ error: "Payments aren't connected." }, { status: 500 });

  try {
    await stripe.paymentIntents.capture(order.stripe_payment_intent);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Capture failed." },
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
    .update({ status: "released" })
    .eq("id", id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

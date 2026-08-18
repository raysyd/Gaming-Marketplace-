import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Webhooks have no user session to check RLS against, so this is the one
 * legitimate place in the app that reaches for the service-role client —
 * everything it writes is derived from a Stripe-signature-verified event,
 * not from anything a browser sent directly.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = await getStripe();
  if (!stripe || !secret)
    return NextResponse.json({ received: true, verified: false });

  const signature = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch {
    return NextResponse.json({ error: "Signature check failed." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ received: true, persisted: false });

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata ?? {};
      const buyerId = meta.buyerId;
      const sellerId = meta.sellerId;
      const listingIds = (meta.listingIds ?? "").split(",").filter(Boolean);
      const paymentIntent =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;

      if (!buyerId || !sellerId || !listingIds.length || !paymentIntent) break;

      // Order is created and held here — this fires once the buyer's card
      // is authorised, before capture. Money moves to the seller later,
      // when /api/orders/[id]/release captures the PaymentIntent.
      const feeBps = Number(process.env.PLATFORM_FEE_BPS ?? 800);
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 100,
      });

      // One row per listing, split by each line item's actual charged
      // amount (not an even split) so a multi-item cart still records
      // correctly. Rounded in cents throughout to match the fee already
      // authorised in /api/checkout.
      const rows = listingIds.map((listingId, i) => {
        const amountCents = lineItems.data[i]?.amount_total ?? 0;
        const feeCents = Math.round((amountCents * feeBps) / 10000);
        return {
          listing_id: listingId,
          buyer_id: buyerId,
          seller_id: sellerId,
          amount: amountCents / 100,
          platform_fee: feeCents / 100,
          stripe_payment_intent: paymentIntent,
          status: "paid",
        };
      });

      const { error } = await admin.from("orders").insert(rows);
      if (error) console.error("Stripe webhook: order insert failed —", error.message);
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntent =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (paymentIntent) {
        const { error } = await admin
          .from("orders")
          .update({ status: "refunded" })
          .eq("stripe_payment_intent", paymentIntent);
        if (error) console.error("Stripe webhook: refund update failed —", error.message);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

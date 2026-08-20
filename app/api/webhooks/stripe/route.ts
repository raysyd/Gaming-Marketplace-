import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { purchaseConfirmationEmail, saleNotificationEmail } from "@/lib/email/templates";
import { BRAND } from "@/lib/brand";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

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
      // /api/checkout charged shipping as its own trailing line item
      // (one per checkout, never per listing) — pull it back out here so
      // it doesn't get mistaken for a listing's price, and to attribute
      // it to exactly one order row (see supabase/02-order-lifecycle.sql).
      const shippingFee = Number(meta.shippingFee ?? 0);

      // One row per listing, split by each line item's actual charged
      // amount (not an even split) so a multi-item cart still records
      // correctly. Rounded in cents throughout to match the fee already
      // authorised in /api/checkout. The whole checkout's shipping fee
      // lands on the first row only — see the shippingFee comment in
      // lib/types.ts — so summing shipping_fee across an order's sibling
      // rows never double-counts it.
      const rows = listingIds.map((listingId, i) => {
        const amountCents = lineItems.data[i]?.amount_total ?? 0;
        const feeCents = Math.round((amountCents * feeBps) / 10000);
        return {
          listing_id: listingId,
          buyer_id: buyerId,
          seller_id: sellerId,
          amount: amountCents / 100,
          platform_fee: feeCents / 100,
          shipping_fee: i === 0 ? shippingFee : 0,
          stripe_payment_intent: paymentIntent,
          status: "paid",
        };
      });

      // onConflict + ignoreDuplicates makes this safe against Stripe
      // retrying the same event (it does, on anything but a fast 2xx) —
      // see the unique index on (stripe_payment_intent, listing_id).
      // Without this, a retried delivery would insert the order twice.
      const { error } = await admin
        .from("orders")
        .upsert(rows, { onConflict: "stripe_payment_intent,listing_id", ignoreDuplicates: true });
      if (error) console.error("Stripe webhook: order insert failed —", error.message);

      // The listing was only ever "reserved" (see /api/checkout) — this is
      // the one place a sale actually locks in. Scoped to `reserved` so a
      // listing a seller separately took down mid-checkout doesn't get
      // silently resurrected as "sold".
      const { error: soldError } = await admin
        .from("listings")
        .update({ status: "sold" })
        .in("id", listingIds)
        .eq("status", "reserved");
      if (soldError) console.error("Stripe webhook: listing sold-flip failed —", soldError.message);

      // Best-effort — see lib/email/send.ts, which itself never throws.
      // A missing/broken SMTP config or a lookup failure here must not
      // turn into a non-2xx response, or Stripe will just keep retrying
      // this whole event (order insert included) forever.
      try {
        const itemNames = lineItems.data
          .filter((li) => li.description !== "Shipping")
          .map((li) => li.description)
          .filter((d): d is string => !!d);
        const listingSummary =
          itemNames.length === 1 ? itemNames[0] : `${itemNames.length} items`;
        const totalAmount = rows.reduce((n, r) => n + r.amount, 0);

        const buyerEmail =
          session.customer_details?.email ??
          (await admin.auth.admin.getUserById(buyerId)).data.user?.email;
        const sellerEmail = (await admin.auth.admin.getUserById(sellerId)).data.user?.email;
        const { data: sellerListing } = await admin
          .from("listings")
          .select("seller_name")
          .eq("id", listingIds[0])
          .maybeSingle();

        if (buyerEmail)
          await sendEmail(
            purchaseConfirmationEmail({
              to: buyerEmail,
              listingTitle: listingSummary,
              amount: totalAmount,
              shippingFee,
              sellerName: sellerListing?.seller_name ?? "the seller",
              orderUrl: `${SITE_URL}/buying`,
            })
          );
        if (sellerEmail)
          await sendEmail(
            saleNotificationEmail({
              to: sellerEmail,
              listingTitle: listingSummary,
              amount: totalAmount,
              orderUrl: `${SITE_URL}/selling?tab=to-post`,
              windowHours: BRAND.orderWindowHours,
            })
          );
      } catch (e) {
        console.error("Stripe webhook: order emails failed —", e instanceof Error ? e.message : e);
      }
      break;
    }

    case "checkout.session.expired": {
      // Buyer never finished paying — release the hold. Scoped to
      // `reserved` so this can never undo a sale that completed through
      // some other path.
      const session = event.data.object as Stripe.Checkout.Session;
      const listingIds = (session.metadata?.listingIds ?? "").split(",").filter(Boolean);
      if (listingIds.length) {
        const { error } = await admin
          .from("listings")
          .update({ status: "active" })
          .in("id", listingIds)
          .eq("status", "reserved");
        if (error) console.error("Stripe webhook: reservation release failed —", error.message);
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntent =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (paymentIntent) {
        const { data: refundedOrders, error } = await admin
          .from("orders")
          .update({ status: "refunded" })
          .eq("stripe_payment_intent", paymentIntent)
          .select("listing_id");
        if (error) console.error("Stripe webhook: refund update failed —", error.message);

        // A refunded sale frees the listing back up — otherwise it's
        // stuck "sold" forever with no way for the seller to relist it.
        const listingIds = (refundedOrders ?? []).map((o) => o.listing_id);
        if (listingIds.length) {
          const { error: relistError } = await admin
            .from("listings")
            .update({ status: "active" })
            .in("id", listingIds)
            .eq("status", "sold");
          if (relistError)
            console.error("Stripe webhook: relist-after-refund failed —", relistError.message);
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

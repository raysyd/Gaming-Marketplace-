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

      // Two entirely different kinds of checkout land on this same event:
      // a marketplace purchase (mode "payment", handled below) and a
      // Premium Seller signup (mode "subscription", handled by
      // customer.subscription.* instead — the subscription itself, not
      // this session, is the durable record of what the buyer actually
      // has, since Stripe can create the session before the first invoice
      // is confirmed to have succeeded).
      if (session.mode === "subscription") break;

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

      // Stock was already decremented (and flipped to "sold" if it hit 0)
      // at reservation time in /api/checkout, via reserve_listing_stock —
      // nothing left to do to the listing here. A completed payment just
      // confirms the reservation is kept, not released.

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
      // Buyer never finished paying — restock what /api/checkout reserved.
      // release_listing_stock only ever increments and never touches a
      // listing that isn't in this exact id list, so this can't undo a
      // sale that completed through some other path.
      const session = event.data.object as Stripe.Checkout.Session;
      const listingIds = (session.metadata?.listingIds ?? "").split(",").filter(Boolean);
      if (listingIds.length) {
        const { error } = await admin.rpc("release_listing_stock", { ids: listingIds });
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

        // A refunded sale gives the unit back — otherwise it's stuck sold
        // (or under-counted, for a quantity > 1 listing) with no way for
        // the seller to sell it again. release_listing_stock only flips
        // status back to "active" if it's currently "sold" — a listing the
        // seller separately deactivated on purpose stays deactivated.
        const listingIds = (refundedOrders ?? []).map((o) => o.listing_id);
        if (listingIds.length) {
          const { error: relistError } = await admin.rpc("release_listing_stock", { ids: listingIds });
          if (relistError)
            console.error("Stripe webhook: relist-after-refund failed —", relistError.message);
        }
      }
      break;
    }

    // Premium Seller (see app/api/premium/checkout/route.ts) — a plain
    // Stripe subscription, unrelated to Connect. The subscription object
    // itself is the source of truth for status, not the checkout session
    // that started it (a session completing doesn't guarantee the first
    // invoice actually succeeded).
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (userId) {
        // Stripe has several non-"active" statuses (past_due, unpaid,
        // incomplete, …) — none of them grant anything, so only "active"
        // (and "trialing", if a trial is ever configured on the price)
        // is stored as active; everything else is stored as-is for
        // visibility but isPremiumActive() treats it as not premium.
        const status = sub.status === "trialing" ? "active" : sub.status;
        const { error } = await admin
          .from("profiles")
          .update({
            premium_status: status,
            premium_subscription_id: sub.id,
            stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          })
          .eq("id", userId);
        if (error) console.error("Stripe webhook: premium status sync failed —", error.message);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (userId) {
        // Scoped to this exact subscription id so a delete event that
        // arrives after the seller already resubscribed (a new
        // subscription id) can't clobber the newer, active one.
        const { error } = await admin
          .from("profiles")
          .update({ premium_status: "canceled" })
          .eq("id", userId)
          .eq("premium_subscription_id", sub.id);
        if (error) console.error("Stripe webhook: premium cancellation sync failed —", error.message);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

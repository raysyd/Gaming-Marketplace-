import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";

/**
 * The actual "pay the seller" step, shared by two callers that reach it
 * completely differently: the buyer clicking "Confirm delivery & release"
 * (POST /api/orders/[id]/release, has a user session) and the 48-hour
 * auto-release cron (POST /api/cron/auto-release, has none — always uses
 * the admin client). Keeping the Stripe transfer logic in exactly one
 * place means those two paths can't quietly drift apart.
 *
 * The idempotency key is keyed on the order id alone (not on which caller
 * triggered it, and not time-based) — that's what makes a replayed cron
 * tick or a double-click land on the exact same transfer instead of
 * paying the seller twice.
 */
export async function releaseOrderPayment(
  orderId: string,
  admin: SupabaseClient
): Promise<{ ok: true } | { error: string; status: number }> {
  const { data: order, error } = await admin
    .from("orders")
    .select("id, seller_id, status, amount, platform_fee, shipping_fee, stripe_payment_intent")
    .eq("id", orderId)
    .single();
  if (error || !order) return { error: "Order not found.", status: 404 };
  if (!["paid", "shipped", "awaiting_confirmation"].includes(order.status))
    return { error: `Can't release an order in "${order.status}" status.`, status: 400 };
  if (!order.stripe_payment_intent)
    return { error: "Order has no payment on file.", status: 400 };

  const { data: sellerProfile } = await admin
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", order.seller_id)
    .maybeSingle();
  const destination = sellerProfile?.stripe_account_id as string | undefined;
  if (!destination) return { error: "Seller has no payout account on file.", status: 400 };

  const stripe = await getStripe();
  if (!stripe) return { error: "Payments aren't connected.", status: 500 };

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

    // Shipping passes through to the seller in full — it's their cost to
    // post the item, not platform revenue, so only the item price has the
    // platform fee taken out of it.
    const transferAmount = Math.round(
      (Number(order.amount) - Number(order.platform_fee) + Number(order.shipping_fee ?? 0)) * 100
    );
    const transfer = await stripe.transfers.create(
      {
        amount: transferAmount,
        currency: "aud",
        destination,
        source_transaction: chargeId,
        metadata: { orderId },
      },
      // A replayed webhook, a retried cron tick, or a buyer double-click
      // must never pay a seller twice for the same order — this is the
      // guarantee, not just a nice-to-have.
      { idempotencyKey: `release:${orderId}` }
    );
    transferId = transfer.id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Transfer failed.", status: 500 };
  }

  const { error: updateError } = await admin
    .from("orders")
    .update({ status: "released", stripe_transfer_id: transferId })
    .eq("id", orderId);
  if (updateError) return { error: updateError.message, status: 500 };

  return { ok: true };
}

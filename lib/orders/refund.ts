import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";

/** Every status an order can still be refunded from. */
export const REFUNDABLE_STATUSES = ["paid", "shipped", "awaiting_confirmation", "disputed", "released"];

/**
 * The actual refund, shared by the seller's Refund button, the admin
 * console and the unshipped-order cron — the same "one place, so callers
 * can't drift" idea as lib/orders/release.ts.
 *
 * Refunds exactly this order row's money (its line amount, plus the
 * checkout's shipping fee if this row carries it), never the whole
 * PaymentIntent: a multi-item checkout is one PaymentIntent shared by
 * several order rows, so refunding the PaymentIntent outright used to
 * refund every item when the seller meant to refund one.
 *
 * If the order was already released, the seller's transfer is reversed
 * first so the refund isn't funded out of the platform's own balance.
 *
 * Also restocks the listing and marks the row refunded. The charge.refunded
 * webhook that Stripe sends afterwards skips rows that are already refunded,
 * so the stock isn't put back twice.
 */
export async function refundOrder(
  orderId: string,
  admin: SupabaseClient
): Promise<{ ok: true } | { error: string; status: number }> {
  const { data: order, error } = await admin
    .from("orders")
    .select("id, status, amount, shipping_fee, listing_id, quantity, stripe_payment_intent, stripe_transfer_id")
    .eq("id", orderId)
    .single();
  if (error || !order) return { error: "Order not found.", status: 404 };
  if (!REFUNDABLE_STATUSES.includes(order.status))
    return { error: `Can't refund an order in "${order.status}" status.`, status: 400 };
  if (!order.stripe_payment_intent) return { error: "Order has no payment on file.", status: 400 };

  const stripe = await getStripe();
  if (!stripe) return { error: "Payments aren't connected.", status: 500 };

  const amountCents = Math.round((Number(order.amount) + Number(order.shipping_fee ?? 0)) * 100);
  try {
    if (order.status === "released") {
      if (!order.stripe_transfer_id)
        throw new Error("Order is marked released but has no transfer on file to reverse.");
      await stripe.transfers.createReversal(order.stripe_transfer_id, undefined, {
        idempotencyKey: `refund-reversal:${orderId}`,
      });
    }
    await stripe.refunds.create(
      { payment_intent: order.stripe_payment_intent, amount: amountCents, metadata: { orderId } },
      { idempotencyKey: `refund:${orderId}:${amountCents}` }
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Refund failed.", status: 500 };
  }

  // Only the request that actually flips the row restocks, so a double
  // click (or this racing the webhook) can't put the units back twice.
  const { data: flipped, error: updateError } = await admin
    .from("orders")
    .update({ status: "refunded", refunded_at: new Date().toISOString() })
    .eq("id", orderId)
    .neq("status", "refunded")
    .select("listing_id, quantity");
  if (updateError) return { error: updateError.message, status: 500 };

  if (flipped?.length) {
    const { error: relistError } = await admin.rpc("release_listing_stock_qty", {
      ids: [order.listing_id],
      qtys: [order.quantity ?? 1],
    });
    if (relistError) console.error("refundOrder: relist failed —", relistError.message);
  }

  return { ok: true };
}

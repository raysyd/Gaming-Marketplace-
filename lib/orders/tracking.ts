import type { SupabaseClient } from "@supabase/supabase-js";
import { getAusPostClient } from "@/lib/shipping/auspost";
import { notifyOrder } from "@/lib/orders/notify";

/**
 * Moves a shipped order to awaiting_confirmation only when Australia Post
 * tracking itself reports it delivered — the one proof of delivery that
 * doesn't come from the person being paid. Returns whether it moved.
 *
 * Until a real AusPost client is plugged into lib/shipping/auspost.ts this
 * always returns false, and shipped orders are settled by the buyer or by
 * the shipped-order fallback in /api/cron/auto-release instead.
 */
export async function markDeliveredIfTracked(admin: SupabaseClient, orderId: string): Promise<boolean> {
  const { data: order } = await admin
    .from("orders")
    .select("id, status, tracking_number, fulfillment_method")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.status !== "shipped" || order.fulfillment_method === "pickup" || !order.tracking_number)
    return false;

  const event = await getAusPostClient().track(order.tracking_number);
  if (event.status !== "delivered") return false;

  const { data: moved } = await admin
    .from("orders")
    .update({ status: "awaiting_confirmation", delivered_at: event.occurredAt ?? new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "shipped")
    .select("id");
  if (!moved?.length) return false;

  await notifyOrder(admin, orderId, "delivered");
  return true;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { BRAND } from "@/lib/brand";
import { money } from "@/lib/format";
import { sendEmail } from "@/lib/email/send";
import { orderUpdateEmail } from "@/lib/email/templates";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export type OrderEvent =
  | "shipped"
  | "delivered"
  | "disputed"
  | "refunded"
  | "auto_refunded"
  | "released"
  | "chargeback";

/**
 * Emails the right people about one step in an order's life. Best-effort by
 * design, like the purchase emails in the Stripe webhook: it never throws,
 * so a missing SMTP config or a lookup failure can't undo or fail the state
 * change that already happened. Needs the service-role client to read the
 * other party's email address.
 */
export async function notifyOrder(admin: SupabaseClient, orderId: string, event: OrderEvent): Promise<void> {
  try {
    const { data: order } = await admin
      .from("orders")
      .select("id, buyer_id, seller_id, amount, platform_fee, shipping_fee, tracking_number, fulfillment_method, dispute_reason, listing_id")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return;

    const { data: listing } = await admin
      .from("listings")
      .select("title")
      .eq("id", order.listing_id)
      .maybeSingle();
    const title = listing?.title ?? "your item";
    const total = Number(order.amount) + Number(order.shipping_fee ?? 0);
    const payout = Number(order.amount) - Number(order.platform_fee) + Number(order.shipping_fee ?? 0);
    const pickup = order.fulfillment_method === "pickup";

    const emailOf = async (id: string) => (await admin.auth.admin.getUserById(id)).data.user?.email;
    const buyerUrl = `${SITE_URL}/buying`;
    const sellerUrl = `${SITE_URL}/selling`;

    const send = async (to: string | undefined, m: Omit<Parameters<typeof orderUpdateEmail>[0], "to">) => {
      if (to) await sendEmail(orderUpdateEmail({ to, ...m }));
    };

    switch (event) {
      case "shipped":
        await send(await emailOf(order.buyer_id), pickup
          ? {
              subject: `Ready to collect — ${title}`,
              heading: `${title} is ready for pickup`,
              lines: [
                "Arrange a time with the seller through Messages.",
                `Only press "Confirm collection & release" once the item is in your hands. Pickup payments never release on their own, so nothing is paid until you do.`,
              ],
              ctaLabel: "View your order",
              ctaUrl: buyerUrl,
            }
          : {
              subject: `Shipped — ${title}`,
              heading: `${title} is on its way`,
              lines: [
                `Australia Post tracking: ${order.tracking_number ?? "not provided"}`,
                "When it arrives, check it matches the listing, then confirm delivery to pay the seller, or report a problem.",
                `If you do nothing, payment releases ${BRAND.shippedAutoReleaseDays} days after posting. Report a problem before then if it hasn't arrived.`,
              ],
              ctaLabel: "View your order",
              ctaUrl: buyerUrl,
            });
        break;

      case "delivered":
        await send(await emailOf(order.buyer_id), {
          subject: `Delivered — ${title}`,
          heading: `Australia Post says ${title} was delivered`,
          lines: [
            `You have ${BRAND.orderWindowHours} hours to check it and report a problem. After that, payment releases to the seller automatically.`,
          ],
          ctaLabel: "Confirm or report a problem",
          ctaUrl: buyerUrl,
        });
        break;

      case "disputed":
        await send(await emailOf(order.seller_id), {
          subject: `Problem reported — ${title}`,
          heading: `The buyer reported a problem with ${title}`,
          lines: [
            `Their words: "${order.dispute_reason ?? "no details given"}"`,
            "Payment stays held while this is sorted out. Reply to the buyer in Messages, or refund them from your seller dashboard.",
          ],
          ctaLabel: "Open your sales",
          ctaUrl: sellerUrl,
        });
        await send(BRAND.supportEmail, {
          subject: `[Dispute] ${title} — order ${order.id}`,
          heading: "A buyer reported a problem",
          lines: [`Order ${order.id}, ${money(total)} held.`, `Reason: ${order.dispute_reason ?? "none given"}`],
          ctaLabel: "Open the admin console",
          ctaUrl: `${SITE_URL}/admin`,
        });
        break;

      case "refunded":
      case "auto_refunded":
        await send(await emailOf(order.buyer_id), {
          subject: `Refunded — ${title}`,
          heading: `You've been refunded ${money(total)}`,
          lines: [
            event === "auto_refunded"
              ? pickup
                ? `The seller didn't hand over ${title} within ${BRAND.pickupHandoverDays} days, so the order was cancelled.`
                : `The seller didn't post ${title} in time, so the order was cancelled.`
              : `Your order for ${title} was refunded.`,
            "Refunds usually reach your card in 5 to 10 business days.",
          ],
          ctaLabel: "View your orders",
          ctaUrl: buyerUrl,
        });
        if (event === "auto_refunded")
          await send(await emailOf(order.seller_id), {
            subject: `Order cancelled — ${title}`,
            heading: `Your sale of ${title} was cancelled`,
            lines: [
              pickup
                ? `It wasn't handed over within ${BRAND.pickupHandoverDays} days, so the buyer was refunded.`
                : `It wasn't posted with tracking within the ${BRAND.orderWindowHours}-hour window, so the buyer was refunded.`,
              "The stock has been added back to your listing.",
            ],
            ctaLabel: "Open your sales",
            ctaUrl: sellerUrl,
          });
        break;

      case "released":
        await send(await emailOf(order.seller_id), {
          subject: `Paid — ${title}`,
          heading: `${money(payout)} is on its way to you`,
          lines: [`Payment for ${title} was released to your Stripe account. Stripe pays it out to your bank on your usual schedule.`],
          ctaLabel: "Open your sales",
          ctaUrl: sellerUrl,
        });
        break;

      case "chargeback":
        await send(BRAND.supportEmail, {
          subject: `[Chargeback] ${title} — order ${order.id}`,
          heading: "A buyer's bank opened a chargeback",
          lines: [
            `Order ${order.id}, ${money(total)}. Payout to the seller is blocked while it's open.`,
            "Respond with evidence in the Stripe dashboard (Payments → Disputes) before the deadline.",
          ],
          ctaLabel: "Open the admin console",
          ctaUrl: `${SITE_URL}/admin`,
        });
        break;
    }
  } catch (e) {
    console.error(`notifyOrder(${event}) failed —`, e instanceof Error ? e.message : e);
  }
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { releaseOrderPayment } from "@/lib/orders/release";
import { refundOrder } from "@/lib/orders/refund";
import { markDeliveredIfTracked } from "@/lib/orders/tracking";
import { notifyOrder } from "@/lib/orders/notify";
import { BRAND } from "@/lib/brand";
import { revalidateTag } from "next/cache";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

/**
 * The daily escrow sweep (see the `crons` entry in vercel.json). Vercel
 * signs scheduled invocations with a bearer token matching CRON_SECRET;
 * without it this is a 401, so an unconfigured secret fails closed.
 *
 * In order:
 *  1. Shipped parcels: ask Australia Post whether they've arrived (a no-op
 *     until a real client is plugged into lib/shipping/auspost.ts).
 *  2. Tracking-confirmed deliveries the buyer hasn't answered within
 *     BRAND.orderWindowHours: release to the seller.
 *  3. Shipped parcels with no confirmed delivery, BRAND.shippedAutoReleaseDays
 *     after posting, with no problem reported: release. The buyer was told
 *     this date in the "shipped" email.
 *  4. Paid orders the seller never posted within BRAND.orderWindowHours (or,
 *     for pickup, never handed over within BRAND.pickupHandoverDays):
 *     refund the buyer so the money isn't held forever.
 *
 * Pickup orders never auto-release: only the buyer confirming collection,
 * or support in /admin, pays the seller for a pickup.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: true, released: 0, refunded: 0, reason: "not configured" });

  const failed: string[] = [];

  // 1. Tracking check.
  const { data: inTransit } = await admin
    .from("orders")
    .select("id")
    .eq("status", "shipped")
    .eq("fulfillment_method", "shipping");
  let delivered = 0;
  for (const o of inTransit ?? []) if (await markDeliveredIfTracked(admin, o.id)) delivered++;

  // 2 + 3. Releases.
  const { data: confirmedDue, error: e1 } = await admin
    .from("orders")
    .select("id")
    .eq("status", "awaiting_confirmation")
    .not("delivered_at", "is", null)
    .lt("delivered_at", ago(BRAND.orderWindowHours * HOUR));
  const { data: untrackedDue, error: e2 } = await admin
    .from("orders")
    .select("id")
    .eq("status", "shipped")
    .eq("fulfillment_method", "shipping")
    .not("shipped_at", "is", null)
    .lt("shipped_at", ago(BRAND.shippedAutoReleaseDays * DAY));
  if (e1 || e2) return NextResponse.json({ ok: false, error: (e1 ?? e2)!.message }, { status: 500 });

  let released = 0;
  for (const o of [...(confirmedDue ?? []), ...(untrackedDue ?? [])]) {
    const result = await releaseOrderPayment(o.id, admin);
    if ("ok" in result) released++;
    else failed.push(`release ${o.id}: ${result.error}`);
  }

  // 4. Never-posted refunds.
  const { data: unshipped, error: e3 } = await admin
    .from("orders")
    .select("id")
    .eq("status", "paid")
    .eq("fulfillment_method", "shipping")
    .lt("created_at", ago(BRAND.orderWindowHours * HOUR));
  const { data: unhandedPickups, error: e4 } = await admin
    .from("orders")
    .select("id")
    .eq("status", "paid")
    .eq("fulfillment_method", "pickup")
    .lt("created_at", ago(BRAND.pickupHandoverDays * DAY));
  if (e3 || e4) return NextResponse.json({ ok: false, error: (e3 ?? e4)!.message }, { status: 500 });

  let refunded = 0;
  for (const o of [...(unshipped ?? []), ...(unhandedPickups ?? [])]) {
    const result = await refundOrder(o.id, admin);
    if ("ok" in result) {
      refunded++;
      await notifyOrder(admin, o.id, "auto_refunded");
    } else failed.push(`refund ${o.id}: ${result.error}`);
  }
  if (refunded) revalidateTag("listings", { expire: 0 });

  if (failed.length) console.error("auto-release: failures —", failed.join(" | "));

  return NextResponse.json({ ok: true, delivered, released, refunded, failed: failed.length });
}

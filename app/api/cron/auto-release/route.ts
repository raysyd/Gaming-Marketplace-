import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { releaseOrderPayment } from "@/lib/orders/release";
import { BRAND } from "@/lib/brand";

/**
 * "Buyer does nothing for 48 hours after delivery -> auto-release" — this
 * is what actually does that. Meant to run on a schedule (see the `crons`
 * entry in vercel.json), not be hit directly; Vercel signs scheduled
 * invocations with a bearer token matching the CRON_SECRET env var, which
 * is what's checked below. Hitting this without that header is a no-op,
 * not an error, so an unconfigured CRON_SECRET fails closed rather than
 * open.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: true, released: 0, reason: "not configured" });

  const cutoff = new Date(Date.now() - BRAND.orderWindowHours * 3600 * 1000).toISOString();
  const { data: due, error } = await admin
    .from("orders")
    .select("id")
    .eq("status", "awaiting_confirmation")
    .not("delivered_at", "is", null)
    .lt("delivered_at", cutoff);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const results = await Promise.all(
    (due ?? []).map(async (o) => ({ id: o.id, result: await releaseOrderPayment(o.id, admin) }))
  );
  const released = results.filter((r) => "ok" in r.result).length;
  const failed = results.filter((r) => "error" in r.result);
  if (failed.length)
    console.error(
      "auto-release: failed for",
      failed.map((f) => f.id).join(", ")
    );

  return NextResponse.json({ ok: true, released, failed: failed.length });
}

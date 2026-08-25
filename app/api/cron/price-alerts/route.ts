import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { queryListings } from "@/lib/data";
import { sendEmail } from "@/lib/email/send";
import { savedSearchAlertEmail } from "@/lib/email/templates";
import { savedSearchHref } from "@/lib/saved-searches-data";
import { siteUrlFrom } from "@/lib/site-url";
import type { ListingQuery } from "@/lib/types";

/**
 * New listings matching a saved search since it was last checked — see
 * supabase/16-saved-searches.sql. Meant to run on a schedule (see the
 * `crons` entry in vercel.json), same CRON_SECRET-bearer-token pattern as
 * auto-release. Deliberately "new listings only," not "price dropped" —
 * that needs a price-history log this codebase doesn't have yet (a
 * natural v2 alongside a price-history graph), so this never claims a
 * price dropped when all it actually knows is a new one showed up.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: true, notified: 0, reason: "not configured" });

  const { data: searches, error } = await admin
    .from("saved_searches")
    .select("id, user_id, label, query, last_notified_at");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const site = siteUrlFrom(req);
  let notified = 0;
  const failed: string[] = [];

  for (const search of searches ?? []) {
    try {
      const query = (search.query as ListingQuery) ?? {};
      const { items } = await queryListings({ ...query, sort: "new", perPage: 20 });
      const since = new Date(search.last_notified_at).getTime();
      const fresh = items.filter((l) => new Date(l.createdAt).getTime() > since);
      if (!fresh.length) continue;

      const { data: authUser } = await admin.auth.admin.getUserById(search.user_id);
      const email = authUser?.user?.email;
      if (!email) continue;

      const { sent } = await sendEmail(
        savedSearchAlertEmail({
          to: email,
          searchLabel: search.label,
          searchUrl: `${site}${savedSearchHref(query)}`,
          listings: fresh.slice(0, 10).map((l) => ({
            title: l.title,
            price: l.price,
            url: `${site}/product/${l.id}/${l.slug}`,
          })),
        })
      );
      if (sent) notified++;

      // Only advance the watermark on a real send — a transient SMTP
      // failure should retry these same listings next run, not silently
      // skip them forever.
      if (sent)
        await admin.from("saved_searches").update({ last_notified_at: new Date().toISOString() }).eq("id", search.id);
    } catch (e) {
      failed.push(search.id);
      console.error("price-alerts: failed for saved search", search.id, e instanceof Error ? e.message : e);
    }
  }

  return NextResponse.json({ ok: true, notified, checked: searches?.length ?? 0, failed: failed.length });
}

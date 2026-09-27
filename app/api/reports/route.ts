import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { orderUpdateEmail } from "@/lib/email/templates";
import { BRAND } from "@/lib/brand";
import { REPORT_REASONS } from "@/lib/reports";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/**
 * "Report this listing / this seller". Inserted with the reporter's own
 * session — RLS only allows reporter_id = auth.uid(), and nobody but the
 * service role (/admin) can read reports back.
 */
export async function POST(req: Request) {
  const limited = await rateLimit(`reports:${clientKey(req)}`, { limit: 5 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many reports. Try again in a minute." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const { listingId, userId, reason, details } = await req.json();
  if (!listingId && !userId)
    return NextResponse.json({ error: "Nothing to report." }, { status: 400 });
  if (!REPORT_REASONS.some((r) => r.value === reason))
    return NextResponse.json({ error: "Pick a reason." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 500 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to report." }, { status: 401 });
  if (userId && userId === user.id)
    return NextResponse.json({ error: "You can't report yourself." }, { status: 400 });

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    listing_id: listingId || null,
    reported_user_id: userId || null,
    reason,
    details: typeof details === "string" ? details.slice(0, 2000) : null,
  });
  if (error) {
    // The one-open-report-per-target index — they've already reported it.
    if (error.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
    return NextResponse.json({ error: "Couldn't send that report." }, { status: 500 });
  }

  await sendEmail(
    orderUpdateEmail({
      to: BRAND.supportEmail,
      subject: `[Report] ${reason}${listingId ? " — listing" : " — user"}`,
      heading: "New report",
      lines: [
        `Reason: ${reason}`,
        listingId ? `Listing: ${SITE_URL}/product/${listingId}/x` : `User: ${SITE_URL}/seller/${userId}`,
        `Details: ${typeof details === "string" && details.trim() ? details.slice(0, 500) : "none"}`,
      ],
      ctaLabel: "Open the admin console",
      ctaUrl: `${SITE_URL}/admin`,
    })
  );

  return NextResponse.json({ ok: true });
}

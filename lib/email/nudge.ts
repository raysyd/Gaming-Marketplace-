import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { orderUpdateEmail } from "@/lib/email/templates";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/**
 * "You have a new message / offer" by email, on top of the in-app bell
 * (supabase/23-notifications.sql). Throttled to one email per conversation
 * per 30 minutes, so a back-and-forth chat doesn't turn into an inbox
 * flood — the first message after a quiet spell is the one worth an email.
 * Best-effort: never throws, never blocks the message itself.
 */
export async function emailNewActivity(params: {
  recipientId: string;
  conversationId: string;
  kind: "message" | "offer";
  preview: string;
}): Promise<void> {
  try {
    const gate = await rateLimit(`email-nudge:${params.recipientId}:${params.conversationId}`, {
      limit: 1,
      windowMs: 30 * 60_000,
    });
    if (!gate.ok) return;

    const admin = createAdminClient();
    if (!admin) return;
    const to = (await admin.auth.admin.getUserById(params.recipientId)).data.user?.email;
    if (!to) return;

    const isOffer = params.kind === "offer";
    await sendEmail(
      orderUpdateEmail({
        to,
        subject: isOffer ? "You have an offer update" : "You have a new message",
        heading: isOffer ? "Offer update" : "New message",
        lines: [params.preview.slice(0, 280), "Reply on Sidegrade — never move payment off the platform."],
        ctaLabel: "Open Messages",
        ctaUrl: `${SITE_URL}/messages`,
      })
    );
  } catch (e) {
    console.error("emailNewActivity failed —", e instanceof Error ? e.message : e);
  }
}

/**
 * Transactional email — order confirmations, sale notifications, and
 * whatever's next (see lib/email/templates.ts, the one place templates
 * live). Deliberately a separate SMTP config from Supabase Auth's, which
 * only exists inside the Supabase dashboard and isn't reachable from this
 * app's own server code — but it's meant to be the *same underlying
 * provider/account* your README already tells you to set up under
 * "Production magic-link email", just also wired in here so this app can
 * send from it directly.
 *
 * No-ops with a logged warning when unconfigured, same "demo mode"
 * pattern as lib/stripe.ts and lib/supabase/* — a missing SMTP_HOST must
 * never crash checkout, it just means the email didn't go out.
 */
import { BRAND } from "@/lib/brand";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM ?? BRAND.supportEmail;

export const hasEmail = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

export async function sendEmail(message: EmailMessage): Promise<{ sent: boolean }> {
  if (!hasEmail) {
    console.warn(
      `[email] SMTP not configured — would have sent "${message.subject}" to ${message.to}`
    );
    return { sent: false };
  }

  try {
    // Lazily imported for the same reason lib/stripe.ts lazily imports
    // `stripe` — keeps nodemailer out of any bundle that doesn't need it.
    const { default: nodemailer } = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transport.sendMail({
      from: `${BRAND.name} <${EMAIL_FROM}>`,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    return { sent: true };
  } catch (e) {
    // An email provider hiccup must never take checkout down with it —
    // log and move on, same as every other "best-effort" write in this
    // codebase (see the webhook's own error handling).
    console.error("[email] send failed —", e instanceof Error ? e.message : e);
    return { sent: false };
  }
}

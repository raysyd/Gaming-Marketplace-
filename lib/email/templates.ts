/**
 * Every transactional email template in one place — see lib/email/send.ts
 * for the part that actually sends them. Order-lifecycle updates all go
 * through orderUpdateEmail() below (see lib/orders/notify.ts).
 */
import { BRAND } from "@/lib/brand";
import { money } from "@/lib/format";
import type { EmailMessage } from "./send";

function wrap(preheader: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f4f4;padding:24px 0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;">
    <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;padding:32px;">
          <tr><td style="font-size:20px;font-weight:700;padding-bottom:16px;">${BRAND.name}</td></tr>
          <tr><td>${bodyHtml}</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function purchaseConfirmationEmail(params: {
  to: string;
  listingTitle: string;
  amount: number;
  shippingFee: number;
  sellerName: string;
  orderUrl: string;
}): EmailMessage {
  const total = params.amount + params.shippingFee;
  const text = `Order confirmed: ${params.listingTitle}\n\nTotal paid: ${money(total)}\nSold by: ${params.sellerName}\n\n${BRAND.name} holds your payment until you confirm the item arrived. Track it here: ${params.orderUrl}`;
  return {
    to: params.to,
    subject: `Order confirmed — ${params.listingTitle}`,
    text,
    html: wrap(
      `Your order for ${escapeHtml(params.listingTitle)} is confirmed.`,
      `<p style="font-size:15px;">Your order is confirmed.</p>
       <p style="font-size:15px;font-weight:600;">${escapeHtml(params.listingTitle)}</p>
       <p style="font-size:14px;color:#555;">Total paid: ${money(total)} · Sold by ${escapeHtml(params.sellerName)}</p>
       <p style="font-size:14px;color:#555;">${BRAND.name} holds your payment until you confirm the item arrived — the seller doesn't get paid until then.</p>
       <p style="margin-top:20px;"><a href="${params.orderUrl}" style="background:#111;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:14px;">View your order</a></p>`
    ),
  };
}

export function saleNotificationEmail(params: {
  to: string;
  listingTitle: string;
  amount: number;
  orderUrl: string;
  windowHours: number;
}): EmailMessage {
  const text = `You sold: ${params.listingTitle}\n\nAmount: ${money(params.amount)}\nPost it within ${params.windowHours} hours and add tracking here: ${params.orderUrl}`;
  return {
    to: params.to,
    subject: `Sold — ${params.listingTitle}`,
    text,
    html: wrap(
      `You sold ${escapeHtml(params.listingTitle)}.`,
      `<p style="font-size:15px;">You made a sale.</p>
       <p style="font-size:15px;font-weight:600;">${escapeHtml(params.listingTitle)}</p>
       <p style="font-size:14px;color:#555;">${money(params.amount)} is held until delivery is confirmed.</p>
       <p style="font-size:14px;color:#555;">Post it within ${params.windowHours} hours and add the Australia Post tracking number from your seller dashboard.</p>
       <p style="margin-top:20px;"><a href="${params.orderUrl}" style="background:#111;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:14px;">Add tracking</a></p>`
    ),
  };
}

export function savedSearchAlertEmail(params: {
  to: string;
  searchLabel: string;
  searchUrl: string;
  listings: { title: string; price: number; url: string }[];
}): EmailMessage {
  const rows = params.listings
    .map(
      (l) =>
        `<tr><td style="padding:6px 0;font-size:14px;"><a href="${l.url}" style="color:#111;text-decoration:none;font-weight:600;">${escapeHtml(l.title)}</a></td><td style="padding:6px 0;font-size:14px;color:#555;text-align:right;">${money(l.price)}</td></tr>`
    )
    .join("");
  const textLines = params.listings.map((l) => `${l.title} — ${money(l.price)} (${l.url})`).join("\n");
  const count = params.listings.length;
  return {
    to: params.to,
    subject: `${count} new listing${count === 1 ? "" : "s"} for "${params.searchLabel}"`,
    text: `New matches for your saved search "${params.searchLabel}":\n\n${textLines}\n\nSee all: ${params.searchUrl}`,
    html: wrap(
      `${count} new listing${count === 1 ? "" : "s"} match "${escapeHtml(params.searchLabel)}".`,
      `<p style="font-size:15px;">New since you saved <strong>${escapeHtml(params.searchLabel)}</strong>:</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
       <p style="margin-top:20px;"><a href="${params.searchUrl}" style="background:#111;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:14px;">See all matches</a></p>
       <p style="font-size:12px;color:#999;margin-top:16px;">Manage or remove this saved search any time from your account.</p>`
    ),
  };
}

/** Listing titles and dispute reasons are user-written — never put them into an email's HTML raw. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * One shape for every order-lifecycle update (shipped, delivered, refunded,
 * released, disputes) — a heading, a few plain lines and one button. Every
 * value is escaped here, so callers pass raw text.
 */
export function orderUpdateEmail(params: {
  to: string;
  subject: string;
  heading: string;
  lines: string[];
  ctaLabel: string;
  ctaUrl: string;
}): EmailMessage {
  const lines = params.lines
    .map((l) => `<p style="font-size:14px;color:#555;">${escapeHtml(l)}</p>`)
    .join("");
  return {
    to: params.to,
    subject: params.subject,
    text: `${params.heading}\n\n${params.lines.join("\n\n")}\n\n${params.ctaLabel}: ${params.ctaUrl}`,
    html: wrap(
      escapeHtml(params.heading),
      `<p style="font-size:15px;font-weight:600;">${escapeHtml(params.heading)}</p>
       ${lines}
       <p style="margin-top:20px;"><a href="${escapeHtml(params.ctaUrl)}" style="background:#111;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:14px;">${escapeHtml(params.ctaLabel)}</a></p>`
    ),
  };
}

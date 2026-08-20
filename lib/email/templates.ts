/**
 * Every transactional email template in one place — see lib/email/send.ts
 * for the part that actually sends them. More are coming (shipped,
 * delivered, dispute updates), so this stays a plain function-per-template
 * module rather than growing a second pattern alongside it.
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
      `Your order for ${params.listingTitle} is confirmed.`,
      `<p style="font-size:15px;">Your order is confirmed.</p>
       <p style="font-size:15px;font-weight:600;">${params.listingTitle}</p>
       <p style="font-size:14px;color:#555;">Total paid: ${money(total)} · Sold by ${params.sellerName}</p>
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
      `You sold ${params.listingTitle}.`,
      `<p style="font-size:15px;">You made a sale.</p>
       <p style="font-size:15px;font-weight:600;">${params.listingTitle}</p>
       <p style="font-size:14px;color:#555;">${money(params.amount)} is held until delivery is confirmed.</p>
       <p style="font-size:14px;color:#555;">Post it within ${params.windowHours} hours and add the Australia Post tracking number from your seller dashboard.</p>
       <p style="margin-top:20px;"><a href="${params.orderUrl}" style="background:#111;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:14px;">Add tracking</a></p>`
    ),
  };
}

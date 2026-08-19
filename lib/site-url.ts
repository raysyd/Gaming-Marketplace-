/**
 * NEXT_PUBLIC_SITE_URL is the preferred source — set it explicitly in
 * Vercel — but this falls back to deriving the real origin from the
 * request itself instead of a hardcoded "http://localhost:3000". That
 * hardcoded fallback silently breaks any redirect URL built from it the
 * moment the env var isn't set on a real deployment: Stripe's Connect
 * onboarding link rejected exactly that URL with "return_url must ...
 * localhost is only allowed in testmode" once it actually reached Stripe
 * from the live site.
 */
export function siteUrlFrom(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedHost) return `${forwardedProto ?? "https"}://${forwardedHost}`;

  return new URL(req.url).origin;
}

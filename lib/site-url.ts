/**
 * NEXT_PUBLIC_SITE_URL is the preferred source — set it explicitly in
 * Vercel — but this falls back to deriving the real origin from the
 * request itself instead of a hardcoded "http://localhost:3000". That
 * hardcoded fallback silently breaks any redirect URL built from it the
 * moment the env var isn't set on a real deployment: Stripe's Connect
 * onboarding link rejected exactly that URL with "return_url must ...
 * localhost is only allowed in testmode" once it actually reached Stripe
 * from the live site.
 *
 * Outside local dev, the env var is also ignored (not just
 * absent-checked) if it's still literally the .env.example placeholder
 * — someone copying every var from that file into Vercel without editing
 * this one is exactly the failure mode this function exists to route
 * around, and an explicitly *wrong* configured value would otherwise
 * still win over the derived one below. (Real local dev legitimately
 * wants localhost here — Stripe test-mode keys accept it — so this only
 * discards it in a deployed environment.)
 */
export function siteUrlFrom(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const looksLikeLocalhost = configured && /localhost|127\.0\.0\.1/.test(configured);
  if (configured && !(looksLikeLocalhost && process.env.NODE_ENV !== "development"))
    return configured.replace(/\/$/, "");

  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedHost) return `${forwardedProto ?? "https"}://${forwardedHost}`;

  return new URL(req.url).origin;
}

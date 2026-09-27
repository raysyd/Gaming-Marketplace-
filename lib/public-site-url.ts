/**
 * The canonical public origin for places with no request to derive it
 * from (sitemap, robots). Same localhost guard as lib/site-url.ts: a
 * leftover .env.example value never leaks into a deployed sitemap.
 */
export function publicSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured && !(/localhost|127\.0\.0\.1/.test(configured) && process.env.NODE_ENV !== "development"))
    return configured;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "https://sidegrade.vercel.app";
}

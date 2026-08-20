/**
 * "rayan.iqbal@..." -> "Rayan Iqbal". Neither profiles.display_name nor
 * listings.seller_name were ever actually written anywhere in this
 * codebase — every real (non-demo) listing/message/review was falling
 * back to a bare "Seller" / "Buyer" / "A buyer" forever, since nothing
 * populated the column those lookups read. This is the fallback used the
 * first time a user's name is needed and their profile doesn't have one
 * yet — see ensureDisplayName below. Deliberately not a real "display
 * name" feature (no settings UI to change it) — just enough that a real
 * person's name shows up somewhere instead of a placeholder.
 */
export function nameFromEmail(email: string | null | undefined): string {
  if (!email) return "";
  const local = email.split("@")[0];
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

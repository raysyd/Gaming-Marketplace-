/**
 * Lazily imported so `stripe` never gets pulled into a bundle that doesn't
 * need it, and returns null instead of throwing when the site isn't
 * configured yet — same "demo mode" pattern as lib/supabase/*.
 */
export async function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  const { default: Stripe } = await import("stripe");
  return new Stripe(key);
}

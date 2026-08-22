import { createPublicClient } from "./supabase/public";

export type PremiumPlan = {
  stripePriceId: string | null;
  monthlyPriceCents: number;
  currency: string;
  freeListingLimit: number;
  premiumListingLimit: number;
  freeMaxPhotos: number;
  premiumMaxPhotos: number;
  badgeLabel: string;
};

// Same shape the DB row defaults to (supabase/08-premium-seller.sql) —
// used when Supabase isn't configured (demo mode) or the row can't be
// read for some reason, so the app degrades to the free tier instead of
// erroring.
const FALLBACK_PLAN: PremiumPlan = {
  stripePriceId: null,
  monthlyPriceCents: 1500,
  currency: "aud",
  freeListingLimit: 10,
  premiumListingLimit: 100,
  freeMaxPhotos: 10,
  premiumMaxPhotos: 20,
  badgeLabel: "Premium Seller",
};

/** Pricing/benefits live in the database, not in code — see 08-premium-seller.sql. */
export async function getPremiumPlan(): Promise<PremiumPlan> {
  const supabase = createPublicClient();
  if (!supabase) return FALLBACK_PLAN;
  const { data } = await supabase.from("premium_plan").select("*").eq("id", true).maybeSingle();
  if (!data) return FALLBACK_PLAN;
  return {
    stripePriceId: data.stripe_price_id,
    monthlyPriceCents: data.monthly_price_cents,
    currency: data.currency,
    freeListingLimit: data.free_listing_limit,
    premiumListingLimit: data.premium_listing_limit,
    freeMaxPhotos: data.free_max_photos,
    premiumMaxPhotos: data.premium_max_photos,
    badgeLabel: data.badge_label,
  };
}

/** Only "active" ever grants anything — see the column comment in 08-premium-seller.sql. */
export function isPremiumActive(status: string | null | undefined): boolean {
  return status === "active";
}

/**
 * Shipping cost *estimate* — not a live rate. There's no AusPost merchant
 * API account (see lib/shipping/auspost.ts's own note on the same
 * limitation for tracking), so this can't be a real-time quote. What it
 * is instead: Australia Post's actual published domestic Parcel Post
 * (own-packaging) rates, which are flat — not zone-dependent — for
 * anything up to 5kg. Source: Australia Post's rates determination,
 * effective 1 July 2026
 * (https://auspost.com.au/content/dam/auspost_corp/media/documents/australia-post-rates-determination.pdf).
 *
 * This only drives an informational "estimated shipping" figure shown to
 * a buyer — it does not change what /api/checkout actually charges,
 * which stays BRAND.shippingFlatRate. Swapping the real charge to this
 * estimate is a separate, larger decision (it'd mean the platform's
 * actual shipping revenue/cost model changes, not just a number shown
 * before checkout) — deliberately not done here.
 */

type WeightTier = { maxGrams: number; cents: number };

const RATE_TABLE: WeightTier[] = [
  { maxGrams: 250, cents: 1020 },
  { maxGrams: 500, cents: 1170 },
  { maxGrams: 1000, cents: 1600 },
  { maxGrams: 3000, cents: 2025 },
  { maxGrams: 5000, cents: 2445 },
];

// Above 5kg, AusPost's real pricing depends on the origin/destination
// zone — data this app doesn't have before checkout (the buyer's
// postcode is only collected inside Stripe's hosted Checkout). This is a
// single, rougher flat estimate for that tier, not a real rate — labelled
// as such everywhere it's shown.
const OVER_5KG_ESTIMATE_CENTS = 3500;

export function estimateShippingCents(weightGrams: number): number {
  const tier = RATE_TABLE.find((t) => weightGrams <= t.maxGrams);
  return tier ? tier.cents : OVER_5KG_ESTIMATE_CENTS;
}

/**
 * Typical weight when a seller hasn't entered one — a reasonable
 * default per subcategory (see lib/taxonomy.ts), not a guess presented
 * as fact; always overridden by the seller's own figure when they give
 * one.
 */
const DEFAULT_WEIGHT_GRAMS: Record<string, number> = {
  "graphics-cards": 1500,
  processors: 200,
  memory: 100,
  storage: 150,
  motherboards: 1200,
  "power-supplies": 2000,
  cases: 7000,
  cooling: 800,
  "cables-extensions": 100,
  "gaming-pcs": 12000,
  "gaming-laptops": 2500,
  workstations: 15000,
  "mini-pcs": 2000,
  monitors: 5000,
  keyboards: 900,
  mice: 150,
  headsets: 400,
  playstation: 3000,
  xbox: 3000,
  nintendo: 500,
  handhelds: 400,
  collectibles: 500,
  "for-parts": 1000,
  "retro-hardware": 1000,
};
const FALLBACK_WEIGHT_GRAMS = 1000;

export function estimatedWeightGrams(subcategorySlug: string, sellerWeightGrams?: number | null): number {
  if (sellerWeightGrams && sellerWeightGrams > 0) return sellerWeightGrams;
  return DEFAULT_WEIGHT_GRAMS[subcategorySlug] ?? FALLBACK_WEIGHT_GRAMS;
}

export function estimateShippingCentsForListing(
  subcategorySlug: string,
  sellerWeightGrams?: number | null
): number {
  return estimateShippingCents(estimatedWeightGrams(subcategorySlug, sellerWeightGrams));
}

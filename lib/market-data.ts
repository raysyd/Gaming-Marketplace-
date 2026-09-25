import { unstable_cache } from "next/cache";
import { createPublicClient } from "./supabase/public";

/**
 * Seller reputation and market-price data — all backed by the aggregate-only
 * SQL functions in supabase/15-market-data.sql (see that file's comments for
 * why each is `security definer`: every one of them returns a summary
 * number, never a raw order/buyer row, so bypassing RLS to compute it is
 * safe).
 */

/** Median minutes to first reply, or null if there's not enough recent data — never a fabricated number. */
export async function getSellerResponseMinutes(sellerId: string): Promise<number | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data } = await supabase.rpc("seller_response_stats", { seller_ids: [sellerId] });
  const row = (data as { seller_id: string; median_response_minutes: number | null }[] | null)?.[0];
  return row?.median_response_minutes ? Number(row.median_response_minutes) : null;
}

/** Which of these reviewers have more than one released order with this seller. */
export async function getRepeatBuyerIds(sellerId: string, buyerIds: string[]): Promise<Set<string>> {
  const ids = [...new Set(buyerIds)].filter(Boolean);
  if (!ids.length) return new Set();
  const supabase = createPublicClient();
  if (!supabase) return new Set();
  const { data } = await supabase.rpc("repeat_buyer_counts", { p_seller_id: sellerId, buyer_ids: ids });
  const rows = (data as { buyer_id: string; order_count: number }[] | null) ?? [];
  return new Set(rows.filter((r) => Number(r.order_count) > 1).map((r) => r.buyer_id));
}

export type PriceStats = { saleCount: number; low: number; high: number };
const MIN_COMPARABLE_SALES = 5;

/** Market-value range for a subcategory — omitted (null) below MIN_COMPARABLE_SALES, so a range is never shown built on noise. */
/** Built from released sales, so it only moves when something sells —
 * cached under the catalogue tag that sales already invalidate. */
export const getSubcategoryPriceStats = unstable_cache(getSubcategoryPriceStatsUncached, ["subcategory-price-stats"], {
  revalidate: 300,
  tags: ["listings"],
});

async function getSubcategoryPriceStatsUncached(subcategorySlug: string): Promise<PriceStats | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data } = await supabase.rpc("subcategory_price_stats", { subcategory_slugs: [subcategorySlug] });
  const row = (data as { subcategory_slug: string; sale_count: number; low: number; high: number }[] | null)?.[0];
  if (!row || Number(row.sale_count) < MIN_COMPARABLE_SALES) return null;
  return { saleCount: Number(row.sale_count), low: Number(row.low), high: Number(row.high) };
}

export type SoldListing = {
  listingId: string;
  title: string;
  slug: string;
  category: string;
  price: number;
  soldAt: string;
};

/** Recently sold listings — title/price only, never buyer/seller identity. Pass sellerId for one seller's own sold items, subcategorySlug for a category-wide rail, or neither for the newest sales platform-wide. */
/** Cached with the catalogue ("listings" tag) — it's on the homepage and
 * every product page, and only changes when something sells, which
 * invalidates that tag (checkout + Stripe webhook). */
export const getRecentlySold = unstable_cache(getRecentlySoldUncached, ["recently-sold"], {
  revalidate: 120,
  tags: ["listings"],
});

async function getRecentlySoldUncached(
  opts: { subcategorySlug?: string; sellerId?: string; limit?: number } = {}
): Promise<SoldListing[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data } = await supabase.rpc("recently_sold_listings", {
    sub: opts.subcategorySlug ?? null,
    p_seller_id: opts.sellerId ?? null,
    limit_count: opts.limit ?? 8,
  });
  return (
    (data as
      | { listing_id: string; title: string; slug: string; category: string; price: number; sold_at: string }[]
      | null) ?? []
  ).map((r) => ({
    listingId: r.listing_id,
    title: r.title,
    slug: r.slug,
    category: r.category,
    price: Number(r.price),
    soldAt: r.sold_at,
  }));
}

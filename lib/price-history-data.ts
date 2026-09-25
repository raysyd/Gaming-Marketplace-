import { unstable_cache } from "next/cache";
import { createPublicClient } from "./supabase/public";

export type PricePoint = { price: number; recordedAt: string };

/** Every price a listing has had, oldest first — see supabase/20-price-history.sql's triggers. Empty for a listing created before that migration ran. */
/** Only changes when a listing's price does, which goes through
 * /api/listings and invalidates the "listings" tag. */
export const getPriceHistory = unstable_cache(getPriceHistoryUncached, ["price-history"], {
  revalidate: 300,
  tags: ["listings"],
});

async function getPriceHistoryUncached(listingId: string): Promise<PricePoint[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("listing_price_history")
    .select("price, recorded_at")
    .eq("listing_id", listingId)
    .order("recorded_at", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({ price: Number(r.price), recordedAt: r.recorded_at }));
}

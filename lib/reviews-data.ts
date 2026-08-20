import { createPublicClient } from "./supabase/public";
import { getAuthedUser } from "./supabase/server";
import type { Review } from "./types";

export type SellerStats = { reviewCount: number; avgRating: number; salesCount: number };

const EMPTY_STATS: SellerStats = { reviewCount: 0, avgRating: 0, salesCount: 0 };

/**
 * One round trip for a whole page's worth of sellers (see the
 * seller_stats() function in supabase/04-reviews.sql) rather than one
 * query per card — same reasoning as listing_counts_by_sub. Demo mode
 * (no Supabase) returns nothing; callers fall back to the listing's own
 * demo-baked numbers in that case, which is fine — demo listings aren't
 * claiming anything about a real seller.
 */
export async function getSellerStats(
  sellerIds: string[]
): Promise<Record<string, SellerStats>> {
  const ids = [...new Set(sellerIds)].filter(Boolean);
  if (!ids.length) return {};
  const supabase = createPublicClient();
  if (!supabase) return {};

  const { data, error } = await supabase.rpc("seller_stats", { seller_ids: ids });
  if (error || !data) return {};

  const out: Record<string, SellerStats> = {};
  for (const row of data as {
    seller_id: string;
    review_count: number;
    avg_rating: number | null;
    sales_count: number;
  }[])
    out[row.seller_id] = {
      reviewCount: Number(row.review_count),
      avgRating: row.avg_rating ? Number(row.avg_rating) : 0,
      salesCount: Number(row.sales_count),
    };
  return out;
}

export async function getOneSellerStats(sellerId: string): Promise<SellerStats> {
  const stats = await getSellerStats([sellerId]);
  return stats[sellerId] ?? EMPTY_STATS;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToReview(r: any): Review {
  return {
    id: r.id,
    orderId: r.order_id,
    reviewerId: r.reviewer_id,
    reviewerName: r.reviewer?.display_name ?? "A buyer",
    sellerId: r.seller_id,
    rating: Number(r.rating),
    body: r.body,
    createdAt: r.created_at,
  };
}

export async function getSellerReviews(sellerId: string): Promise<Review[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  // Same story as lib/messages-data.ts: reviewer_id references auth.users,
  // not profiles, so the name needs a second lookup rather than an embed.
  const reviewerIds = [...new Set(data.map((r) => r.reviewer_id as string))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", reviewerIds);
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  return data.map((r) => rowToReview({ ...r, reviewer: { display_name: nameById.get(r.reviewer_id) } }));
}

/** Orders the signed-in buyer has completed but hasn't reviewed yet — drives the "Leave a review" prompt on /buying. */
export async function getReviewableOrderIds(): Promise<Set<string>> {
  const { supabase, user } = await getAuthedUser();
  if (!supabase || !user) return new Set();
  const { data: released } = await supabase
    .from("orders")
    .select("id")
    .eq("buyer_id", user.id)
    .eq("status", "released");
  if (!released?.length) return new Set();
  const { data: reviewed } = await supabase
    .from("reviews")
    .select("order_id")
    .in("order_id", released.map((o) => o.id));
  const reviewedIds = new Set((reviewed ?? []).map((r) => r.order_id));
  return new Set(released.map((o) => o.id).filter((id) => !reviewedIds.has(id)));
}

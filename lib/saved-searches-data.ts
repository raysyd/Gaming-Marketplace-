import { getAuthedUser } from "./supabase/server";
import type { ListingQuery } from "./types";

export type SavedSearch = {
  id: string;
  label: string;
  query: ListingQuery;
  createdAt: string;
};

/** Reads back to the same /shop?... URL a search was saved from. */
export function savedSearchHref(query: ListingQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.sub) params.set("sub", query.sub);
  if (query.conditions?.length) params.set("condition", query.conditions.join(","));
  if (query.minPrice) params.set("min", String(query.minPrice));
  if (query.maxPrice) params.set("max", String(query.maxPrice));
  if (query.freeShipping) params.set("free", "1");
  if (query.verifiedOnly) params.set("verified", "1");
  if (query.dealsOnly) params.set("deals", "1");
  const qs = params.toString();
  return qs ? `/shop?${qs}` : "/shop";
}

export async function listSavedSearches(): Promise<SavedSearch[]> {
  const { supabase, user } = await getAuthedUser();
  if (!supabase || !user) return [];
  const { data, error } = await supabase
    .from("saved_searches")
    .select("id, label, query, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    label: r.label,
    query: (r.query as ListingQuery) ?? {},
    createdAt: r.created_at,
  }));
}

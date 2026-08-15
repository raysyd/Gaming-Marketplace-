import { rowToListing } from "./data";
import type { Listing } from "./types";
import { createClient } from "./supabase/server";

export async function querySellerListings(): Promise<Listing[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToListing);
}
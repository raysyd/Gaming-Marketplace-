import { rowToListing } from "./data";
import type { Listing, Order } from "./types";
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

export type SellerProfile = { userId: string; stripeAccountId: string | null };

export async function getSellerProfile(): Promise<SellerProfile | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .maybeSingle();
  return { userId: user.id, stripeAccountId: data?.stripe_account_id ?? null };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToOrder(r: any): Order {
  return {
    id: r.id,
    listingId: r.listing_id,
    listingTitle: r.listings?.title,
    buyerId: r.buyer_id,
    sellerId: r.seller_id,
    amount: Number(r.amount),
    platformFee: Number(r.platform_fee),
    stripePaymentIntent: r.stripe_payment_intent,
    trackingNumber: r.tracking_number,
    status: r.status,
    createdAt: r.created_at,
  };
}

export async function querySellerOrders(): Promise<Order[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("orders")
    .select("*, listings(title)")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToOrder);
}

export async function queryBuyerOrders(): Promise<Order[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("orders")
    .select("*, listings(title)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToOrder);
}

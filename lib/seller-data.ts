import { rowToListing } from "./data";
import type { Listing, Order } from "./types";
import { getAuthedUser } from "./supabase/server";

export async function querySellerListings(): Promise<Listing[]> {
  const { supabase, user } = await getAuthedUser();
  if (!supabase || !user) return [];
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => rowToListing(r));
}

export type SellerProfile = { userId: string; stripeAccountId: string | null };

export async function getSellerProfile(): Promise<SellerProfile | null> {
  const { supabase, user } = await getAuthedUser();
  if (!supabase || !user) return null;
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
    listingSlug: r.listings?.slug,
    listingImage: r.listings?.image,
    buyerId: r.buyer_id,
    sellerId: r.seller_id,
    sellerName: r.listings?.seller_name,
    amount: Number(r.amount),
    platformFee: Number(r.platform_fee),
    shippingFee: Number(r.shipping_fee ?? 0),
    stripePaymentIntent: r.stripe_payment_intent,
    trackingNumber: r.tracking_number,
    shippedAt: r.shipped_at,
    deliveredAt: r.delivered_at,
    disputeReason: r.dispute_reason,
    status: r.status,
    createdAt: r.created_at,
  };
}

const ORDER_SELECT = "*, listings(title, slug, image, seller_name)";

export async function querySellerOrders(): Promise<Order[]> {
  const { supabase, user } = await getAuthedUser();
  if (!supabase || !user) return [];
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToOrder);
}

export async function queryBuyerOrders(): Promise<Order[]> {
  const { supabase, user } = await getAuthedUser();
  if (!supabase || !user) return [];
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToOrder);
}

export async function getOrder(id: string): Promise<Order | null> {
  const { supabase, user } = await getAuthedUser();
  if (!supabase || !user) return null;
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  // RLS's "order parties read" policy already scopes reads to the buyer or
  // seller, but that's enforced at the row level regardless of this
  // check — this just avoids handing an authorized-but-wrong-party shape
  // of the data to a caller that assumes one or the other.
  if (data.buyer_id !== user.id && data.seller_id !== user.id) return null;
  return rowToOrder(data);
}

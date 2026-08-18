import { DEMO_LISTINGS } from "./demo";
import type { Listing, ListingPage, ListingQuery } from "./types";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "./supabase/public";
import { artKindFor, slugify } from "./taxonomy";

export const PER_PAGE = 24;

/**
 * Paginated, filtered listing query.
 *
 * Everything — search, filters, sort, count — runs in the database and returns
 * one page at a time. This is the difference between a site that works with a
 * hundred listings and one that works with a hundred thousand: the client never
 * receives the full catalogue.
 */
async function queryListingsUncached(q: ListingQuery = {}): Promise<ListingPage> {
  const page = Math.max(1, q.page ?? 1);
  const perPage = q.perPage ?? PER_PAGE;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const supabase = createPublicClient();

  if (!supabase) return filterDemo(q, page, perPage);

  let sel = supabase
    .from("listings")
    .select("*", { count: "exact" })
    .eq("status", q.status ?? "active");

  if (q.sub) sel = sel.eq("subcategory_slug", q.sub);
  else if (q.category) sel = sel.eq("category_slug", q.category);
  if (q.conditions?.length) sel = sel.in("condition", q.conditions);
  if (q.minPrice != null) sel = sel.gte("price", q.minPrice);
  if (q.maxPrice != null) sel = sel.lte("price", q.maxPrice);
  if (q.freeShipping) sel = sel.eq("ships_free", true);
  if (q.verifiedOnly) sel = sel.eq("seller_verified", true);
  if (q.dealsOnly) sel = sel.not("compare_at", "is", null);
  if (q.q?.trim()) sel = sel.textSearch("search_vector", q.q.trim(), { type: "websearch" });

  if (q.sort === "low") sel = sel.order("price", { ascending: true });
  else if (q.sort === "high") sel = sel.order("price", { ascending: false });
  else if (q.sort === "watched") sel = sel.order("watchers", { ascending: false });
  else sel = sel.order("created_at", { ascending: false });

  const { data, count, error } = await sel.range(from, to);
  if (error || !data) return filterDemo(q, page, perPage);

  const total = count ?? data.length;

  // Connected but no listings yet: show the demo catalogue rather than an
  // empty shop. Only when nothing is filtered — a filter that legitimately
  // matches nothing must still show "no results".
  const unfiltered =
    !q.q && !q.category && !q.sub && !q.conditions?.length &&
    q.minPrice == null && q.maxPrice == null &&
    !q.freeShipping && !q.verifiedOnly && !q.dealsOnly && !q.status;
  if (total === 0 && unfiltered) return filterDemo(q, page, perPage);
  return {
    items: data.map(rowToListing),
    total,
    page,
    perPage,
    pages: Math.max(1, Math.ceil(total / perPage)),
  };
}

async function getListingUncached(id: string): Promise<Listing | null> {
  const supabase = createPublicClient();
  if (!supabase) return DEMO_LISTINGS.find((l) => l.id === id) ?? null;
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .eq("status", "active")
    .single();
  if (!data) return DEMO_LISTINGS.find((l) => l.id === id) ?? null;
  return rowToListing(data);
}

/**
 * /shop reads searchParams, which forces the whole route dynamic in Next —
 * its own `revalidate` export is a no-op there, so every sort/filter click
 * used to hit Supabase live with zero caching. unstable_cache works at the
 * data layer instead, keyed automatically by the arguments each call is
 * made with (so "sort=low" and "sort=watched" cache independently), and
 * gets invalidated explicitly by revalidateTag("listings") in
 * app/api/listings/route.ts whenever a listing is created or taken down —
 * so this is a strict speed win, not a staleness trade-off.
 *
 * React `cache` on top dedupes identical calls within a single render pass,
 * so the homepage's four rails and the header don't each re-run the same
 * query.
 */
const queryListingsCachedByArgs = unstable_cache(
  queryListingsUncached,
  ["listings-query"],
  { revalidate: 45, tags: ["listings"] }
);
const getListingCachedByArgs = unstable_cache(
  getListingUncached,
  ["listing-by-id"],
  { revalidate: 45, tags: ["listings"] }
);

export const queryListings = cache(queryListingsCachedByArgs);
export const getListing = cache(getListingCachedByArgs);

export async function getRelated(listing: Listing, limit = 4): Promise<Listing[]> {
  const { items } = await queryListings({
    sub: listing.subcategorySlug,
    perPage: limit + 1,
  });
  return items.filter((l) => l.id !== listing.id).slice(0, limit);
}

async function countBySubUncached(): Promise<Record<string, number>> {
  const supabase = createPublicClient();
  if (!supabase) {
    const out: Record<string, number> = {};
    for (const l of DEMO_LISTINGS)
      out[l.subcategorySlug] = (out[l.subcategorySlug] ?? 0) + 1;
    return out;
  }
  const { data } = await supabase.rpc("listing_counts_by_sub");
  if (!data) return {};
  const out: Record<string, number> = {};
  for (const row of data as { subcategory_slug: string; n: number }[])
    out[row.subcategory_slug] = Number(row.n);
  return out;
}

/** Facet counts for the filter rail, computed without pulling rows. */
export const countBySub = cache(
  unstable_cache(countBySubUncached, ["listing-facet-counts"], {
    revalidate: 45,
    tags: ["listings"],
  })
);

/* ------------------------------------------------------------------ */

function filterDemo(q: ListingQuery, page: number, perPage: number): ListingPage {
  const needle = q.q?.trim().toLowerCase();
  let out = DEMO_LISTINGS.filter((l) => {
    if (q.sub && l.subcategorySlug !== q.sub) return false;
    if (!q.sub && q.category && l.categorySlug !== q.category) return false;
    if (q.conditions?.length && !q.conditions.includes(l.condition)) return false;
    if (q.minPrice != null && l.price < q.minPrice) return false;
    if (q.maxPrice != null && l.price > q.maxPrice) return false;
    if (q.freeShipping && !l.shipsFree) return false;
    if (q.verifiedOnly && !l.sellerVerified) return false;
    if (q.dealsOnly && !l.compareAt) return false;
    if (q.status && (l.status ?? "active") !== q.status) return false;
    if (!needle) return true;
    return [l.title, l.brand, l.description, ...l.specs.map((s) => s.value)]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  out = out.sort((a, b) => {
    if (q.sort === "low") return a.price - b.price;
    if (q.sort === "high") return b.price - a.price;
    if (q.sort === "watched") return b.watchers - a.watchers;
    if (q.sort === "save")
      return (
        (b.compareAt ? b.compareAt - b.price : 0) -
        (a.compareAt ? a.compareAt - a.price : 0)
      );
    return +new Date(b.createdAt) - +new Date(a.createdAt);
  });

  const total = out.length;
  const from = (page - 1) * perPage;
  return {
    items: out.slice(from, from + perPage),
    total,
    page,
    perPage,
    pages: Math.max(1, Math.ceil(total / perPage)),
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function rowToListing(r: any): Listing {
  const sub = r.subcategory_slug ?? "gaming-pcs";
  return {
    id: r.id,
    slug: r.slug ?? slugify(r.title ?? ""),
    title: r.title,
    categorySlug: r.category_slug ?? "full-systems",
    subcategorySlug: sub,
    category: artKindFor(sub) as Listing["category"],
    price: Number(r.price),
    compareAt: r.compare_at ? Number(r.compare_at) : undefined,
    condition: r.condition,
    brand: r.brand ?? "",
    specs: r.specs ?? [],
    fps1080p: r.fps_1080p ?? undefined,
    image: r.image ?? "",
    images: r.images ?? [],
    description: r.description ?? "",
    sellerId: r.seller_id,
    sellerName: r.seller_name ?? "Seller",
    sellerRating: Number(r.seller_rating ?? 5),
    sellerSales: Number(r.seller_sales ?? 0),
    sellerVerified: Boolean(r.seller_verified),
    location: r.location ?? "",
    state: r.state ?? "",
    shipsFree: Boolean(r.ships_free),
    acceptsOffers: Boolean(r.accepts_offers),
    watchers: Number(r.watchers ?? 0),
    stock: Number(r.stock ?? 1),
    createdAt: r.created_at,
    status: r.status ?? "active",
  };
}

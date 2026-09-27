import { unstable_cache } from "next/cache";
import { createPublicClient } from "./supabase/public";
import { DEMO_LISTINGS } from "./demo";
import { modelOf, type ModelKind } from "./models";
import type { Listing, MarketTag } from "./types";

/**
 * The going rate for each GPU and CPU model: the median of what that exact
 * model is listed or has sold for on Sidegrade. It's what powers "8% under
 * the going rate" on cards and the price board on the homepage.
 *
 * Honest by construction: a model only gets a rate once there are at
 * least MIN_COMPS comparable listings, the 30-day change only shows when
 * both windows have data, and the UI calls it "going rate" (asking and
 * sold prices together), never a valuation.
 */
export const MIN_COMPS = 3;

export type ModelStats = {
  key: string;
  name: string;
  kind: ModelKind;
  /** Median of every comparable price, asking and sold. */
  rate: number;
  /** Cheapest and dearest comparable, asking or sold. */
  low: number;
  high: number;
  /** Cheapest one for sale right now, if any. */
  lowestAsk: number | null;
  forSale: number;
  sold: number;
  comps: number;
  /** Change in the median between the previous 30 days and the last 30, as a fraction. Null without data in both. */
  change: number | null;
  /** Weekly medians, oldest first, for the sparkline (only weeks with data). */
  spark: number[];
  /** Up to 80 comparable prices for the market strip; sold ones flagged. */
  points: { price: number; sold: boolean }[];
};

type Sample = { title: string; subcategorySlug: string; price: number; status: string; createdAt: string };

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

async function loadSample(): Promise<Sample[]> {
  const supabase = createPublicClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("listings")
      .select("title, subcategory_slug, price, status, created_at")
      .in("subcategory_slug", ["graphics-cards", "processors"])
      .in("status", ["active", "sold"])
      .order("created_at", { ascending: false })
      .limit(4000);
    if (!error && data?.length)
      return data.map((r) => ({
        title: r.title,
        subcategorySlug: r.subcategory_slug,
        price: Number(r.price),
        status: r.status,
        createdAt: r.created_at,
      }));
  }
  // No database, or nothing listed yet: the same sample catalogue the shop shows.
  return DEMO_LISTINGS.filter((l) => ["graphics-cards", "processors"].includes(l.subcategorySlug)).map((l) => ({
    title: l.title,
    subcategorySlug: l.subcategorySlug,
    price: l.price,
    status: l.status ?? "active",
    createdAt: l.createdAt,
  }));
}

async function buildIndex(): Promise<ModelStats[]> {
  const rows = await loadSample();
  const groups = new Map<string, { name: string; kind: ModelKind; rows: Sample[] }>();
  for (const r of rows) {
    const m = modelOf(r);
    if (!m || !(r.price > 0)) continue;
    const g = groups.get(m.key) ?? { name: m.name, kind: m.kind, rows: [] };
    g.rows.push(r);
    groups.set(m.key, g);
  }

  const now = Date.now();
  const DAY = 86400000;
  const out: ModelStats[] = [];
  for (const [key, g] of groups) {
    if (g.rows.length < MIN_COMPS) continue;
    const prices = g.rows.map((r) => r.price);
    const asks = g.rows.filter((r) => r.status === "active").map((r) => r.price);
    const age = (r: Sample) => (now - new Date(r.createdAt).getTime()) / DAY;
    const recent = g.rows.filter((r) => age(r) <= 30).map((r) => r.price);
    const before = g.rows.filter((r) => age(r) > 30 && age(r) <= 60).map((r) => r.price);
    const change = recent.length >= 2 && before.length >= 2 ? median(recent) / median(before) - 1 : null;

    const weeks = new Map<number, number[]>();
    for (const r of g.rows) {
      const w = Math.floor(age(r) / 7);
      if (w < 12) weeks.set(w, [...(weeks.get(w) ?? []), r.price]);
    }
    const spark = [...weeks.entries()].sort((a, b) => b[0] - a[0]).map(([, xs]) => median(xs));

    out.push({
      key,
      name: g.name,
      kind: g.kind,
      rate: Math.round(median(prices)),
      low: Math.min(...prices),
      high: Math.max(...prices),
      lowestAsk: asks.length ? Math.min(...asks) : null,
      forSale: asks.length,
      sold: g.rows.length - asks.length,
      comps: g.rows.length,
      change,
      spark,
      points: g.rows.slice(0, 80).map((r) => ({ price: r.price, sold: r.status === "sold" })),
    });
  }
  return out.sort((a, b) => b.comps - a.comps);
}

/** Every model with a going rate, most-traded first. Cached with the catalogue. */
export const getMarketIndex = unstable_cache(buildIndex, ["market-index"], { revalidate: 300, tags: ["listings"] });

/** Where one listing's price sits against its model's going rate, or undefined if there's no rate for it. */
export function marketTagFor(l: Pick<Listing, "title" | "subcategorySlug" | "price">, index: ModelStats[]): MarketTag | undefined {
  const m = modelOf(l);
  if (!m) return undefined;
  const s = index.find((x) => x.key === m.key);
  if (!s) return undefined;
  return { model: s.name, modelKey: s.key, rate: s.rate, delta: l.price / s.rate - 1, comps: s.comps };
}

/** Adds market tags to a page of listings (one cached index lookup for the lot). */
export async function withMarket<T extends Listing>(items: T[]): Promise<T[]> {
  if (!items.some((l) => l.subcategorySlug === "graphics-cards" || l.subcategorySlug === "processors")) return items;
  const index = await getMarketIndex();
  return items.map((l) => ({ ...l, market: marketTagFor(l, index) }));
}

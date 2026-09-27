import { NextResponse } from "next/server";
import { countBySub } from "@/lib/data";
import { getRecentlySold } from "@/lib/market-data";

export type MarketPulse = {
  live: number;
  topSubs: { slug: string; count: number }[];
  sold: Awaited<ReturnType<typeof getRecentlySold>>;
};

/** What the header ticker (components/MarketTicker.tsx) reads: live listing
 * counts and recent sales, both from cached queries, so polling it never
 * hits the database directly. */
export async function GET() {
  const [counts, sold] = await Promise.all([countBySub(), getRecentlySold({ limit: 6 })]);
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  const body: MarketPulse = {
    live: entries.reduce((sum, [, n]) => sum + n, 0),
    topSubs: entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([slug, count]) => ({ slug, count })),
    sold,
  };
  return NextResponse.json(body, {
    headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}

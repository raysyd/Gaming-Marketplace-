import Link from "next/link";
import { connection } from "next/server";
import { queryListings, countBySub } from "@/lib/data";
import { getMarketIndex } from "@/lib/market-index";
import { money } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { TAXONOMY } from "@/lib/taxonomy";
import { TIERS, type Tier } from "@/lib/deal-tier";
import { ProductCard } from "@/components/ProductCard";
import { DemoBanner } from "@/components/DemoBanner";
import { HeroTicker } from "@/components/market/HeroTicker";
import { MarketSearch } from "@/components/market/MarketSearch";
import { Board, type BoardListing } from "@/components/market/Board";
import { InView } from "@/components/market/InView";
import { TierMark } from "@/components/market/Tier";
import type { Listing } from "@/lib/types";

/**
 * The homepage is the market: what used GPUs and CPUs are going for right
 * now, the week's price moves, the deals under the going rate, then the
 * rest of the catalogue. Every number comes from listings and sales on
 * Sidegrade (lib/market-index.ts); deal tiers are lib/deal-tier.ts.
 */
export default async function Home() {
  // Rendered per request from cached, tag-invalidated data (lib/data.ts).
  await connection();
  const [index, all, fresh, gpus, cpus, counts] = await Promise.all([
    getMarketIndex(),
    queryListings({ perPage: 1 }),
    queryListings({ sort: "new", perPage: 8 }),
    queryListings({ sub: "graphics-cards", sort: "low", perPage: 96 }),
    queryListings({ sub: "processors", sort: "low", perPage: 96 }),
    countBySub(),
  ]);

  const board = index.slice(0, 12);
  const parts = [...gpus.items, ...cpus.items].filter((l) => l.market);
  const cheapest: Record<string, BoardListing[]> = {};
  for (const m of board)
    cheapest[m.key] = parts
      .filter((l) => l.market!.modelKey === m.key)
      .sort((a, b) => a.price - b.price)
      .slice(0, 3)
      .map((l) => ({ id: l.id, slug: l.slug, title: l.title, price: l.price, location: l.location }));

  const deals = parts
    .filter((l) => l.market!.delta <= -0.03 && l.market!.delta > -0.45)
    .sort((a, b) => a.market!.delta - b.market!.delta)
    .slice(0, 8);
  const movers = index
    .filter((m) => m.change != null && Math.abs(m.change) >= 0.005)
    .sort((a, b) => Math.abs(b.change!) - Math.abs(a.change!))
    .slice(0, 6);
  const week = Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 86400000));
  const ticker = index.slice(0, 8).map(({ key, name, rate, change, forSale, spark }) => ({ key, name, rate, change, forSale, spark }));

  return (
    <>
      {fresh.isDemo && (
        <div className="mx-auto max-w-[1400px] px-4 pt-4 lg:px-8">
          <DemoBanner />
        </div>
      )}

      {/* Hero: the live sentence, the search that answers as you type, the tiers */}
      <section className="border-b border-line bg-card">
        <div className="mx-auto grid max-w-[1400px] gap-12 px-4 py-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-end lg:px-8 lg:py-20">
          <div>
            <p className="eyebrow mb-5">
              {all.total.toLocaleString("en-AU")} listings live · {index.length} models priced · {BRAND.regionLabel}
            </p>
            {ticker.length ? (
              <HeroTicker models={ticker} />
            ) : (
              <h1 className="display text-[clamp(38px,5.4vw,78px)]">Know the going rate before you buy.</h1>
            )}
            <div className="mt-9">
              <MarketSearch models={index.map(({ key, name, rate, change, forSale }) => ({ key, name, rate, change, forSale }))} />
            </div>
          </div>

          <aside className="rounded-[var(--radius-card)] border border-line bg-paper p-6">
            <p className="eyebrow">Every price gets a tier</p>
            <ul className="mt-4 grid gap-2.5">
              {(["S", "A", "B", "C", "check"] as Tier[]).map((t) => (
                <li key={t} className="flex items-center gap-3 text-sm">
                  <TierMark tier={t} />
                  <span className="font-semibold">{TIERS[t].short}</span>
                  <span className="ml-auto text-right text-muted">
                    {
                      {
                        S: "12–45% under the going rate",
                        A: "3–12% under",
                        B: "About the going rate",
                        C: "5% or more over",
                        check: "Too cheap to be true. Ask for proof",
                      }[t]
                    }
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
              The going rate is the median of that model across listings and sales here. Your payment waits with us
              until the part arrives.
            </p>
          </aside>
        </div>
      </section>

      {/* The leaderboard */}
      <InView as="section" className="mx-auto max-w-[1400px] px-4 pt-16 lg:px-8">
        <div className="sec-head">
          <div>
            <h2 className="sec-title">Going rates</h2>
            <p className="mt-2 text-sm text-muted">Ranked by how much each model trades. Select one to see every price and the cheapest to buy.</p>
          </div>
          <Link href="/shop?category=pc-parts-and-components" className="sec-link">
            All parts
          </Link>
        </div>
        {board.length ? (
          <Board models={board} cheapest={cheapest} />
        ) : (
          <div className="board px-6 py-10 text-center">
            <p className="font-semibold">The board fills in as parts are listed and sold.</p>
            <p className="mt-1 text-sm text-muted">A model gets a going rate once three or more have been listed or sold on {BRAND.name}.</p>
          </div>
        )}
      </InView>

      {/* Patch notes + deals */}
      <section className="mx-auto grid max-w-[1400px] gap-8 px-4 pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:px-8">
        {movers.length > 0 && (
          <InView>
            <div className="sec-head">
              <h2 className="sec-title">Patch notes</h2>
              <span className="mono text-xs text-muted">Week {week}</span>
            </div>
            <div className="patch">
              {movers.map((m) => {
                const nerf = m.change! < 0;
                return (
                  <Link key={m.key} href={`/shop?q=${encodeURIComponent(m.name)}&sort=low`} className="patch-row hover:bg-paper">
                    <span className={`patch-tag ${nerf ? "is-nerf" : "is-buff"}`}>{nerf ? "Nerfed" : "Buffed"}</span>
                    <span className="min-w-0">
                      <b className="block truncate">{m.name}</b>
                      <span className="block text-xs text-muted">
                        {nerf ? "Cheaper" : "Dearer"}: now {money(m.rate)}
                      </span>
                    </span>
                    <span className={`mono text-sm ${nerf ? "chg-down" : "chg-up"}`}>
                      {nerf ? "▼" : "▲"}
                      {Math.abs(m.change! * 100).toFixed(1)}%
                    </span>
                  </Link>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted">Change in each model&apos;s going rate over the last 30 days.</p>
          </InView>
        )}
        <Grid title="Under the going rate" href="/shop?category=pc-parts-and-components&sort=low" items={deals} cols={movers.length ? 3 : 4} />
      </section>

      {/* Categories as an index with live counts */}
      <InView as="section" className="mx-auto max-w-[1400px] px-4 pt-16 lg:px-8">
        <div className="sec-head">
          <h2 className="sec-title">Browse the market</h2>
          <Link href="/shop" className="sec-link">
            Everything
          </Link>
        </div>
        <div className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {TAXONOMY.map((top) => {
            const n = top.children.reduce((sum, c) => sum + (counts[c.slug] ?? 0), 0);
            return (
              <div key={top.slug} className="bg-card p-5">
                <Link href={`/shop?category=${top.slug}`} className="group flex items-baseline justify-between gap-2">
                  <h3 className="text-[15px] font-semibold tracking-tight group-hover:underline">{top.name}</h3>
                  <span className="mono text-xs text-muted">{n}</span>
                </Link>
                <ul className="mt-3 grid gap-1.5">
                  {top.children.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/shop?category=${top.slug}&sub=${c.slug}`} className="flex items-baseline justify-between gap-2 text-sm text-muted hover:text-ink">
                        <span>{c.name}</span>
                        <span className="mono text-[11px]">{counts[c.slug] ?? 0}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </InView>

      <section className="mx-auto max-w-[1400px] px-4 pt-16 lg:px-8">
        <Grid title="Just listed" href="/shop" items={fresh.items} cols={4} />
      </section>

      {/* Selling */}
      <InView as="section" className="mx-auto max-w-[1400px] px-4 pt-16 lg:px-8">
        <div className="grid gap-8 rounded-[var(--radius-card)] bg-chrome px-6 py-12 text-white sm:px-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="mono mb-3 text-xs uppercase tracking-[0.1em] text-white/50">Upgrading?</p>
            <h2 className="display text-[clamp(30px,3.6vw,48px)] text-white">Your old card is worth more than a drawer.</h2>
            <p className="mt-3 max-w-2xl text-white/65">
              Check its going rate above, list it at a fair tier, and get paid when the buyer confirms it arrived. Listing is
              free; {BRAND.name} takes {BRAND.feePercent}% only when it sells.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/sell" className="btn h-12 bg-white px-6 text-[#0c0d10] shadow-[0_2px_0_rgba(255,255,255,0.25)] hover:bg-white/90">
              List a part
            </Link>
            <Link href="/trust" className="btn h-12 border-white/25 px-6 text-white hover:border-white">
              How payment works
            </Link>
          </div>
        </div>
      </InView>
    </>
  );
}

function Grid({ title, href, items, cols }: { title: string; href: string; items: Listing[]; cols: 3 | 4 }) {
  if (!items.length) return null;
  return (
    <InView>
      <div className="sec-head">
        <h2 className="sec-title">{title}</h2>
        <Link href={href} className="sec-link">
          View all
        </Link>
      </div>
      <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${cols === 4 ? "lg:grid-cols-4" : ""}`}>
        {items.slice(0, cols === 3 ? 6 : 8).map((l) => (
          <ProductCard key={l.id} listing={l} />
        ))}
      </div>
    </InView>
  );
}

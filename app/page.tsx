import Link from "next/link";
import { connection } from "next/server";
import { queryListings, countBySub } from "@/lib/data";
import { getMarketIndex } from "@/lib/market-index";
import { money } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { TAXONOMY } from "@/lib/taxonomy";
import { ProductCard } from "@/components/ProductCard";
import { DemoBanner } from "@/components/DemoBanner";
import { PriceBoard } from "@/components/market/PriceBoard";
import type { Listing } from "@/lib/types";

/**
 * The homepage is a market board: what used GPUs and CPUs are going for
 * right now, the listings priced under that, then everything else. All
 * numbers come from listings and sales on Sidegrade (lib/market-index.ts).
 */
export default async function Home() {
  // Rendered per request from cached, tag-invalidated data (lib/data.ts).
  await connection();
  const [index, all, fresh, gpus, cpus, counts] = await Promise.all([
    getMarketIndex(),
    queryListings({ perPage: 1 }),
    queryListings({ sort: "new", perPage: 8 }),
    queryListings({ sub: "graphics-cards", perPage: 96 }),
    queryListings({ sub: "processors", perPage: 96 }),
    countBySub(),
  ]);

  const tagged = [...gpus.items, ...cpus.items].filter((l) => l.market);
  const under = tagged
    .filter((l) => l.market!.delta <= -0.03)
    .sort((a, b) => a.market!.delta - b.market!.delta)
    .slice(0, 8);
  const underShare = tagged.length
    ? Math.round((tagged.filter((l) => l.market!.delta <= -0.03).length / tagged.length) * 100)
    : null;
  const falling = index.filter((m) => m.change != null && m.change < 0).sort((a, b) => a.change! - b.change!)[0];
  const board = index.slice(0, 10);
  const quick = index.slice(0, 6);

  return (
    <>
      {fresh.isDemo && (
        <div className="mx-auto max-w-[1400px] px-4 pt-4 lg:px-8">
          <DemoBanner />
        </div>
      )}

      {/* Hero: the pitch, a search, and today's market in numbers */}
      <section className="border-b border-line bg-card">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-center lg:px-8 lg:py-16">
          <div>
            <p className="eyebrow">Used PC parts · {BRAND.regionLabel}</p>
            <h1 className="display mt-4 text-[clamp(40px,5.6vw,80px)]">
              Know the <span className="lime-mark">going rate</span>
              <br />
              before you buy.
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted">
              Every graphics card and processor on {BRAND.name} is priced against what the same model is going for.
              Buy under it, sell at it, and the money waits with us until the part arrives.
            </p>
            <form action="/shop" className="mt-7 flex max-w-xl gap-2">
              <label htmlFor="home-q" className="sr-only">
                Search
              </label>
              <input
                id="home-q"
                name="q"
                placeholder="Search a model: RTX 3080, 7800X3D, PS5…"
                className="input h-12 flex-1 rounded-[10px] text-[15px]"
              />
              <button className="btn btn-primary h-12 px-6">Search</button>
            </form>
            {quick.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {quick.map((m) => (
                  <Link key={m.key} href={`/shop?q=${encodeURIComponent(m.name)}&sort=low`} className="pill">
                    {m.name}
                    <span className="mono text-muted">{money(m.rate)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <aside className="rounded-[var(--radius-card)] border border-line bg-paper p-6" aria-label={`Today on ${BRAND.name}`}>
            <p className="eyebrow">Today on {BRAND.name}</p>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-6">
              <Stat label="Listings live" value={all.total.toLocaleString("en-AU")} />
              <Stat label="Models priced" value={String(index.length)} />
              <Stat label="GPUs & CPUs under going rate" value={underShare == null ? "—" : `${underShare}%`} />
              <Stat
                label={falling ? `${falling.name}, 30 days` : "Biggest 30-day drop"}
                value={falling ? `▼ ${Math.abs(falling.change! * 100).toFixed(1)}%` : "—"}
                tone={falling ? "down" : undefined}
              />
            </dl>
            <ul className="mt-6 grid gap-2 border-t border-line pt-5 text-sm">
              <Check text="Your payment is held until you confirm the part arrived" />
              <Check text="Refunded automatically if it isn't posted within 48 hours" />
              <Check text={`Sellers pay ${BRAND.feePercent}% only when it sells. Listing is free`} />
            </ul>
          </aside>
        </div>
      </section>

      {/* The board */}
      <section className="mx-auto max-w-[1400px] px-4 pt-14 lg:px-8">
          <div className="sec-head">
            <div>
              <h2 className="sec-title">Going rates</h2>
              <p className="mt-2 text-sm text-muted">
                Median price of each model across listings and sales on {BRAND.name}. Select a row to shop it.
              </p>
            </div>
            <Link href="/shop?category=pc-parts-and-components" className="sec-link">
              All parts
            </Link>
          </div>
          {board.length > 0 ? (
            <PriceBoard models={board} />
          ) : (
            <div className="board px-6 py-10 text-center">
              <p className="font-semibold">The board fills in as parts are listed and sold.</p>
              <p className="mt-1 text-sm text-muted">
                A model gets a going rate once three or more have been listed or sold on {BRAND.name}.
              </p>
            </div>
          )}
        </section>

      <Grid title="Under the going rate" href="/shop?category=pc-parts-and-components&sort=low" items={under} />

      {/* Categories as a plain index with live counts */}
      <section className="mx-auto max-w-[1400px] px-4 pt-14 lg:px-8">
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
                  <h3 className="text-[15px] font-semibold group-hover:underline">{top.name}</h3>
                  <span className="mono text-xs text-muted">{n}</span>
                </Link>
                <ul className="mt-3 grid gap-1.5">
                  {top.children.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/shop?category=${top.slug}&sub=${c.slug}`}
                        className="flex items-baseline justify-between gap-2 text-sm text-muted hover:text-ink"
                      >
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
      </section>

      <Grid title="Just listed" href="/shop" items={fresh.items} />

      {/* Selling */}
      <section className="mx-auto max-w-[1400px] px-4 pt-16 lg:px-8">
        <div className="grid gap-8 rounded-[var(--radius-card)] bg-chrome px-6 py-10 text-white sm:px-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <h2 className="display text-[clamp(28px,3.4vw,44px)] text-white">Upgrading? See what your old card is worth.</h2>
            <p className="mt-3 max-w-2xl text-white/65">
              Look up your model on the board, list it at the going rate, and get paid when the buyer confirms it
              arrived. Listing is free; {BRAND.name} takes {BRAND.feePercent}% only when it sells.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/sell" className="btn h-12 bg-[var(--color-lime)] px-6 text-[#101114] hover:brightness-95">
              List a part
            </Link>
            <Link href="/trust" className="btn h-12 border-white/25 px-6 text-white hover:border-white">
              How payment works
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "down" }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`price mt-1 text-[28px] leading-none ${tone === "down" ? "chg-down" : ""}`}>{value}</dd>
    </div>
  );
}

function Check({ text }: { text: string }) {
  return (
    <li className="flex gap-2.5">
      <svg width="16" height="16" viewBox="0 0 24 24" className="mt-0.5 shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="var(--color-lime)" />
        <path d="M7 12.4l3.2 3.2L17 8.8" fill="none" stroke="#101114" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{text}</span>
    </li>
  );
}

function Grid({ title, href, items }: { title: string; href: string; items: Listing[] }) {
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-[1400px] px-4 pt-14 lg:px-8">
      <div className="sec-head">
        <h2 className="sec-title">{title}</h2>
        <Link href={href} className="sec-link">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.slice(0, 8).map((l) => (
          <ProductCard key={l.id} listing={l} />
        ))}
      </div>
    </section>
  );
}

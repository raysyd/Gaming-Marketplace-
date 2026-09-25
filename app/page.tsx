import Link from "next/link";
import Image from "next/image";
import { queryListings } from "@/lib/data";
import { money } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { TAXONOMY } from "@/lib/taxonomy";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { CATEGORY_PHOTOS } from "@/lib/category-photos";
import { DemoBanner } from "@/components/DemoBanner";
import { SoldTicker } from "@/components/SoldTicker";
import { getRecentlySold } from "@/lib/market-data";
import type { Category } from "@/lib/types";
import { Reveal } from "@/components/motion/Reveal";
import { HeroSearch } from "@/components/motion/HeroSearch";
import { DealCarousel } from "@/components/motion/DealCarousel";
import { EscrowFlow } from "@/components/motion/EscrowFlow";
import { connection } from "next/server";

// artKindFor(top.children[0].slug) would pick whichever subcategory
// happens to be first in taxonomy.ts (e.g. "Monitors" for Peripherals,
// since that's its first child) — fine for generic per-listing fallback
// art, but the wrong photo for this specific tile. Pick deliberately here.
const TILE_CATEGORY: Record<string, Category> = {
  "full-systems": "Prebuilt PCs",
  "pc-parts-and-components": "Graphics Cards",
  peripherals: "Peripherals",
  consoles: "Consoles",
  // No dedicated photo for this group; the close-up chip shot reads as
  // "parts and hardware" without implying a specific item.
  "collectibles-and-parts": "Processors",
};


export default async function Home() {
  // Rendered per request, from data that's cached and invalidated by tag
  // (see lib/data.ts). Timed ISR here meant the first visitor after any
  // change got the previous copy — the "only a hard refresh shows it" bug.
  await connection();
  const [deals, watched, fresh, prebuilts, sold, justSold] = await Promise.all([
    queryListings({ dealsOnly: true, sort: "save", perPage: 8 }),
    queryListings({ sort: "watched", perPage: 8 }),
    queryListings({ sort: "new", perPage: 8 }),
    queryListings({ sub: "gaming-pcs", sort: "new", perPage: 1 }),
    queryListings({ status: "sold", sort: "new", perPage: 8 }),
    getRecentlySold({ limit: 8 }),
  ]);

  const heroDeals = (deals.items.length ? deals.items : fresh.items).slice(0, 4);

  return (
    <>
      {fresh.isDemo && (
        <div className="mx-auto max-w-[1560px] px-4 lg:px-6 pt-4">
          <DemoBanner />
        </div>
      )}
      <SoldTicker initial={justSold} />
      <section className="hero-bg relative overflow-hidden border-b border-line bg-card">
        <span className="hero-blob hero-blob-a" aria-hidden="true" />
        <span className="hero-blob hero-blob-b" aria-hidden="true" />
        <span className="hero-grid" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[1560px] items-center gap-10 px-4 lg:px-6 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,600px)] lg:gap-16 lg:py-16">
          <div>
            <h1 className="display text-[clamp(38px,5.4vw,78px)]">
              <span className="word-rise" style={{ animationDelay: "0.05s" }}>Somebody</span>{" "}
              <span className="word-rise" style={{ animationDelay: "0.12s" }}>already</span>
              <br />
              <span className="word-rise" style={{ animationDelay: "0.19s" }}>built</span>{" "}
              <span className="word-rise" style={{ animationDelay: "0.26s" }}>your</span>{" "}
              <span className="word-rise" style={{ animationDelay: "0.33s" }}><span className="rgb-text">next PC.</span></span>
            </h1>
            <p className="rise mt-4 max-w-md text-[15px] leading-relaxed text-muted" style={{ animationDelay: "0.35s" }}>
              {BRAND.name} is where Australian gamers sell the rig, card or board
              they just upgraded out of. You pay through us, we hold the money
              until the box lands on your doorstep.
            </p>
            <div className="rise mt-6 max-w-xl" style={{ animationDelay: "0.45s" }}>
              <HeroSearch />
            </div>
            <ul className="rise mt-7 grid max-w-md grid-cols-3 gap-3 border-t border-line pt-5" style={{ animationDelay: "0.55s" }}>
              {[
                ["Escrow", "Held till delivered"],
                ["Fee", `${BRAND.feePercent}% on sale`],
                ["Listing", "Free, always"],
              ].map(([k, v]) => (
                <li key={k}>
                  <div className="eyebrow">{k}</div>
                  <div className="mt-1 text-[13px] font-semibold">{v}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rise" style={{ animationDelay: "0.25s" }}>
            <DealCarousel deals={heroDeals} />
          </div>
        </div>
      </section>

      {/* Category tiles, two levels deep */}
      <section className="mx-auto max-w-[1560px] px-4 lg:px-6 py-10">
        <Reveal stagger className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {TAXONOMY.map((top) => (
            <div key={top.slug} className="cat-tile group">
              <Link href={`/shop?category=${top.slug}`} className="block">
                <div className="rgb-frame relative aspect-square w-full overflow-hidden rounded-[10px] bg-ink lg:aspect-[4/5]">
                  <Image
                    src={CATEGORY_PHOTOS[TILE_CATEGORY[top.slug] ?? "Graphics Cards"]}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 240px, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition duration-700 group-hover:scale-[1.08]"
                  />
                  <span className="cat-shade" aria-hidden="true" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <h3 className="display text-[15px] text-white sm:text-[19px]">{top.name}</h3>
                    <span className="cat-cta spec">Shop now →</span>
                  </div>
                </div>
              </Link>
              <ul className="cat-subs">
                {top.children.slice(0, 4).map((sub) => (
                  <li key={sub.slug}>
                    <Link href={`/shop?category=${top.slug}&sub=${sub.slug}`}>{sub.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Reveal>
      </section>

      <Rail title="Most watched" href="/shop?sort=watched" items={watched.items} />
      <Rail title="Price drops" href="/shop?deals=1" items={deals.items} />

      <ThemeRail />

      {/* PC Finder */}
      <section className="mx-auto mt-12 max-w-[1560px] px-4 lg:px-6">
        <div className="flex flex-col items-start gap-5 rounded-[10px] bg-chrome px-6 py-10 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div>
            <p className="eyebrow text-white/50">PC Finder</p>
            <h2 className="display mt-2 max-w-lg text-[clamp(22px,3vw,30px)] text-white">
              Don&apos;t know what you need? Three questions.
            </h2>
            <p className="mt-2 max-w-md text-[14px] text-white/65">
              Budget, resolution, what else it has to do. We point you at the
              listings that actually match.
            </p>
          </div>
          <Link
            href="/pc-finder"
            className="rgb-ring shrink-0 rounded-md bg-deal px-6 py-3 text-[14px] font-semibold text-white transition hover:brightness-110"
          >
            Take the quiz
          </Link>
        </div>
      </section>

      {/* Escrow explainer */}
      <section className="mx-auto mt-6 max-w-[1560px] px-4 lg:px-6">
        <div className="rounded-[10px] border border-line bg-card px-6 py-10 sm:px-10">
          <p className="eyebrow">Where your money sits</p>
          <h2 className="display mt-2 max-w-lg text-[clamp(24px,3.5vw,34px)]">
            Nobody sends a stranger $2,000 and hopes.
          </h2>
          <EscrowFlow />
          <Link
            href="/trust"
            className="mt-6 inline-block text-[13px] font-semibold text-trust"
          >
            Read Trust &amp; Safety →
          </Link>
        </div>
      </section>

      <Rail title="Just listed" href="/shop" items={fresh.items} />
      <Rail title="Recently sold" href="/shop?status=sold" items={sold.items} />

      <section className="mx-auto mt-12 max-w-[1560px] px-4 lg:px-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/trust"
            className="card-hover group rounded-[10px] bg-trust p-6 text-white transition hover:brightness-105"
          >
            <span className="text-2xl" aria-hidden="true">★</span>
            <h2 className="display mt-3 text-[26px] text-white">Reviews from the community</h2>
            <p className="mt-2 text-[14px] text-white/75">See how Sidegrade keeps buying and selling clear.</p>
            <span className="mt-5 inline-block text-[13px] font-semibold text-white">Trust &amp; safety →</span>
          </Link>
          <Link
            href="/selling"
            className="card-hover group rounded-[10px] bg-chrome p-6 text-white transition hover:bg-chrome-2"
          >
            <span className="text-2xl" aria-hidden="true">↗</span>
            <h2 className="display mt-3 text-[26px] text-white">Seller sales</h2>
            <p className="mt-2 text-[14px] text-white/70">Manage listings, track orders and see what your gear is worth.</p>
            <span className="mt-5 inline-block text-[13px] font-semibold text-white">Open seller account →</span>
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-[1560px] px-4 lg:px-6">
        <div className="flex flex-col items-start gap-4 rounded-[10px] border border-line bg-card p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="display text-[24px]">Sitting on an old card?</h2>
            <p className="mt-1 text-[14px] text-muted">
              Listing costs nothing. You only pay when it sells.
            </p>
          </div>
          <Link
            href="/sell"
            className="rgb-ring rounded-md bg-deal px-6 py-3 text-[14px] font-semibold text-white transition hover:brightness-110"
          >
            List an item
          </Link>
        </div>
      </section>
    </>
  );
}

function ThemeRail() {
  const themes = [
    ["Budget builds", "Under $1,000", "/shop?max=1000", "↘"],
    ["4K gaming", "High-refresh hardware", "/shop?sub=gaming-pcs&min=1800", "◈"],
    ["Desk upgrades", "Monitors and peripherals", "/shop?category=peripherals", "▦"],
    ["PC parts", "Build it your way", "/shop?category=pc-parts-and-components", "⚙"],
  ];
  return (
    <section className="mx-auto max-w-[1560px] px-4 lg:px-6 pt-10">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="display text-[26px]">Shop by theme</h2>
        <Link href="/shop" className="text-[13px] font-semibold text-trust">Browse all →</Link>
      </div>
      <Reveal stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {themes.map(([title, body, href, icon]) => (
          <Link key={title} href={href} className="card-hover group rounded-[10px] border border-line bg-card p-5 transition hover:border-trust">
            <span className="text-2xl text-trust" aria-hidden="true">{icon}</span>
            <h3 className="display mt-4 text-[20px]">{title}</h3>
            <p className="mt-1 text-[13px] text-muted">{body}</p>
          </Link>
        ))}
      </Reveal>
    </section>
  );
}

function Rail({
  title,
  href,
  items,
}: {
  title: string;
  href: string;
  items: Awaited<ReturnType<typeof queryListings>>["items"];
}) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-[1560px] px-4 lg:px-6 pt-8">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="display text-[26px]">{title}</h2>
        <Link href={href} className="text-[13px] font-semibold text-trust">
          See all →
        </Link>
      </div>
      <Reveal
        stagger
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
      >
        {items.slice(0, 8).map((l) => (
          <ProductCard key={l.id} listing={l} />
        ))}
      </Reveal>
    </section>
  );
}

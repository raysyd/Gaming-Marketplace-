import Link from "next/link";
import Image from "next/image";
import { queryListings } from "@/lib/data";
import { BRAND } from "@/lib/brand";
import { TAXONOMY } from "@/lib/taxonomy";
import { ProductCard } from "@/components/ProductCard";
import { CATEGORY_PHOTOS } from "@/lib/category-photos";
import { DemoBanner } from "@/components/DemoBanner";
import { SoldTicker } from "@/components/SoldTicker";
import { getRecentlySold } from "@/lib/market-data";
import type { Category } from "@/lib/types";
import { Reveal } from "@/components/motion/Reveal";
import { HeroSearch } from "@/components/motion/HeroSearch";
import { DealCarousel } from "@/components/motion/DealCarousel";
import { EscrowFlow } from "@/components/motion/EscrowFlow";
import { CountUp } from "@/components/motion/CountUp";
import { Icon } from "@/components/ui/Icon";
import {
  BudgetArt,
  DeskArt,
  FourKArt,
  GpuTagArt,
  PartsArt,
  QuizArt,
  Traces,
} from "@/components/ui/Illustrations";

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

export const revalidate = 60;

export default async function Home() {
  const [deals, watched, fresh, prebuilts, sold, justSold] = await Promise.all([
    queryListings({ dealsOnly: true, sort: "save", perPage: 8 }),
    queryListings({ sort: "watched", perPage: 8 }),
    queryListings({ sort: "new", perPage: 8 }),
    queryListings({ sub: "gaming-pcs", sort: "new", perPage: 1 }),
    queryListings({ status: "sold", sort: "new", perPage: 8 }),
    getRecentlySold({ limit: 8 }),
  ]);
  void prebuilts;

  const heroDeals = (deals.items.length ? deals.items : fresh.items).slice(0, 4);
  const words = ["Somebody", "already", "built", "your"];

  return (
    <>
      {fresh.isDemo && (
        <div className="mx-auto max-w-[1480px] px-4 pt-4 lg:px-8">
          <DemoBanner />
        </div>
      )}

      {/* ---------------------------------------------------------------- Hero */}
      <section className="hero">
        <span className="hero-glow" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[1480px] items-center gap-12 px-4 pb-16 pt-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-16 lg:px-8 lg:pb-24 lg:pt-16">
          <div>
            <p className="rise inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-[12.5px] font-medium text-ink-soft shadow-[var(--shadow-sm)]">
              <span className="live-dot" aria-hidden="true" />
              <CountUp value={fresh.total} /> listings live across {BRAND.regionLabel}
            </p>
            <h1 className="display display-tight mt-6 text-[clamp(46px,6.6vw,96px)]">
              {words.map((w, i) => (
                <span key={w}>
                  <span className="word-rise" style={{ animationDelay: `${0.05 + i * 0.07}s` }}>{w}</span>{" "}
                </span>
              ))}
              <span className="word-rise" style={{ animationDelay: "0.35s" }}>
                <span className="scribble text-deal">
                  next PC.
                  <svg viewBox="0 0 300 30" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M4 20 C 60 8, 120 26, 180 14 S 270 10, 296 16" />
                  </svg>
                </span>
              </span>
            </h1>
            <p className="lede rise mt-7 max-w-[33rem]" style={{ animationDelay: "0.35s" }}>
              {BRAND.name} is where Australian gamers sell the rig, card or board
              they just upgraded out of. You pay through us, we hold the money
              until the box lands on your doorstep.
            </p>
            <div className="rise mt-8 max-w-[580px]" style={{ animationDelay: "0.45s" }}>
              <HeroSearch />
            </div>
            <dl className="rise mt-10 grid max-w-[520px] grid-cols-3 gap-4 border-t-[1.5px] border-dashed border-line-strong pt-6" style={{ animationDelay: "0.55s" }}>
              {(
                [
                  ["Escrow", "Held till delivered", "lock"],
                  ["Seller fee", `${BRAND.feePercent}% on sale`, "tag"],
                  ["Listing", "Free, always", "sparkle"],
                ] as const
              ).map(([k, v, icon]) => (
                <div key={k}>
                  <dt className="tag-label flex items-center gap-1.5 text-muted">
                    <Icon name={icon} size={13} />
                    {k}
                  </dt>
                  <dd className="mt-1.5 text-[14.5px] font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative rise lg:pl-4" style={{ animationDelay: "0.25s" }}>
            <DealCarousel deals={heroDeals} />
            <p className="margin-note hand -left-4 -top-12 hidden xl:flex" aria-hidden="true">
              real listings, real people
              <svg width="46" height="40" viewBox="0 0 46 40" fill="none">
                <path d="M4 6c16-2 30 6 34 26m0 0-7-5m7 5 3-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </p>
          </div>
        </div>
      </section>

      <SoldTicker initial={justSold} />

      {/* ------------------------------------------------------- Categories */}
      <section className="mx-auto max-w-[1480px] px-4 pt-16 lg:px-8 lg:pt-24">
        <SectionHead
          index="01"
          title="Browse the bench"
          lede="Five aisles, every one of them stocked by someone who just upgraded."
          href="/shop"
          linkLabel="Everything"
        />
        <Reveal stagger className="grid auto-rows-[190px] grid-cols-2 gap-3 sm:auto-rows-[220px] lg:grid-cols-4 lg:gap-4">
          {TAXONOMY.map((top, i) => {
            const big = i === 0;
            return (
              <div key={top.slug} className={`cat-tile group ${big ? "col-span-2 row-span-2" : ""}`}>
                <Image
                  src={CATEGORY_PHOTOS[TILE_CATEGORY[top.slug] ?? "Graphics Cards"]}
                  alt=""
                  fill
                  sizes={big ? "(min-width: 1024px) 720px, 100vw" : "(min-width: 1024px) 360px, 50vw"}
                  className="object-cover"
                  priority={big}
                />
                <span className="cat-shade" aria-hidden="true" />
                <Link href={`/shop?category=${top.slug}`} className="absolute inset-0 z-[1]" aria-label={`Shop ${top.name}`} />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex items-end justify-between gap-3 p-4 sm:p-5">
                  <div className="min-w-0">
                    <p className="tag-label text-white/60">Aisle {String(i + 1).padStart(2, "0")}</p>
                    <h3 className={`display mt-1 text-white [overflow-wrap:normal] ${big ? "text-[clamp(28px,3.4vw,44px)]" : "text-[17px] sm:text-[22px]"}`}>{top.name}</h3>
                    {big && (
                      <ul className="pointer-events-auto mt-4 hidden flex-wrap gap-1.5 sm:flex">
                        {top.children.slice(0, 5).map((sub) => (
                          <li key={sub.slug}>
                            <Link
                              href={`/shop?category=${top.slug}&sub=${sub.slug}`}
                              className="inline-block rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[12.5px] font-medium text-white backdrop-blur transition hover:border-white hover:bg-white hover:text-[#17150f]"
                            >
                              {sub.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <span className="cat-arrow shrink-0" aria-hidden="true">
                    <Icon name="arrow-up-right" size={17} strokeWidth={2.2} />
                  </span>
                </div>
              </div>
            );
          })}
        </Reveal>
      </section>

      <Rail index="02" title="Most watched" lede="What everyone's hovering over this week." href="/shop?sort=watched" items={watched.items} />
      <Rail index="03" title="Price drops" lede="Sellers who blinked first." href="/shop?deals=1" items={deals.items} hot />

      <ThemeRail />

      {/* ------------------------------------------------------ Escrow board */}
      <section className="mx-auto mt-20 max-w-[1480px] px-4 lg:mt-28 lg:px-8">
        <div className="relative overflow-hidden rounded-[20px] bg-chrome px-6 py-12 text-[#f3efe6] sm:px-10 lg:px-14 lg:py-16">
          <Traces className="pointer-events-none absolute inset-0 h-full w-full opacity-50" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="tag-label text-[#d4a73a]">04 — Where your money sits</p>
              <h2 className="display mt-3 max-w-2xl text-[clamp(30px,4.2vw,54px)]">
                Nobody sends a stranger $2,000 and <span className="hand text-[1.15em] font-semibold text-[#ff8a57]">hopes.</span>
              </h2>
            </div>
            <Link href="/trust" className="btn btn-outline shrink-0 !border-white/25 !bg-transparent !text-[#f3efe6] hover:!border-white">
              How buyer protection works
              <Icon name="arrow-right" size={16} strokeWidth={2.4} className="btn-arrow" />
            </Link>
          </div>
          <div className="relative">
            <EscrowFlow />
          </div>
        </div>
      </section>

      <Rail index="05" title="Just listed" lede="Fresh on the bench, still warm." href="/shop" items={fresh.items} />

      {/* --------------------------------------------- PC Finder + Sell duo */}
      <section className="mx-auto mt-20 grid max-w-[1480px] gap-4 px-4 lg:mt-28 lg:grid-cols-2 lg:px-8">
        <Reveal className="relative flex flex-col overflow-hidden rounded-[20px] bg-chrome-2 p-7 text-[#f3efe6] sm:p-10">
          <p className="tag-label text-[#d4a73a]">PC Finder</p>
          <h2 className="display mt-3 max-w-sm text-[clamp(28px,3vw,40px)] sm:max-w-[58%]">
            Don&apos;t know what you need? Three questions.
          </h2>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-[#b7c0b8] sm:max-w-[55%]">
            Budget, resolution, what else it has to do. We point you at the
            listings that actually match.
          </p>
          <QuizArt className="pointer-events-none mt-8 w-[min(320px,80%)] self-end sm:absolute sm:right-6 sm:top-1/2 sm:mt-0 sm:w-[36%] sm:-translate-y-1/2" />
          <Link href="/pc-finder" className="btn btn-primary mt-8 self-start sm:mt-auto">
            Take the quiz
            <Icon name="arrow-right" size={16} strokeWidth={2.4} className="btn-arrow" />
          </Link>
        </Reveal>

        <Reveal className="relative flex flex-col overflow-hidden rounded-[20px] bg-signal p-7 text-signal-ink sm:p-10">
          <span className="perfboard pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
          <p className="tag-label relative">Selling</p>
          <h2 className="display relative mt-3 max-w-sm text-[clamp(28px,3vw,40px)] sm:max-w-[58%]">
            Sitting on an old card?
          </h2>
          <p className="relative mt-3 max-w-sm text-[15px] leading-relaxed text-signal-ink/80 sm:max-w-[55%]">
            Listing costs nothing. You only pay {BRAND.feePercent}% when it sells, and
            the money&apos;s already waiting in escrow before you post it.
          </p>
          <GpuTagArt className="pointer-events-none relative mt-6 w-[min(320px,85%)] self-end sm:absolute sm:right-5 sm:top-1/2 sm:mt-0 sm:w-[38%] sm:-translate-y-1/2" />
          <div className="relative mt-8 flex flex-wrap gap-2 sm:mt-auto">
            <Link href="/sell" className="btn btn-dark">
              List an item
              <Icon name="arrow-right" size={16} strokeWidth={2.4} className="btn-arrow" />
            </Link>
            <Link href="/selling" className="btn btn-ghost !text-signal-ink hover:!bg-black/10">
              Open your shop
            </Link>
          </div>
        </Reveal>
      </section>

      <Rail index="06" title="Recently sold" lede="Proof this place moves hardware — and what it actually went for." href="/shop?status=sold" items={sold.items} />
    </>
  );
}

function SectionHead({
  index,
  title,
  lede,
  href,
  linkLabel = "See all",
  hot,
}: {
  index?: string;
  title: string;
  lede?: string;
  href?: string;
  linkLabel?: string;
  hot?: boolean;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        {index && (
          <p className={`tag-label mb-2.5 flex items-center gap-2 ${hot ? "text-deal" : "text-muted"}`}>
            <span>{index}</span>
            <span className="h-px w-8 bg-current opacity-50" aria-hidden="true" />
            {hot && <Icon name="trending-down" size={13} />}
          </p>
        )}
        <h2 className="display text-[clamp(30px,3.6vw,46px)]">{title}</h2>
        {lede && <p className="mt-2 text-[15px] text-muted">{lede}</p>}
      </div>
      {href && (
        <Link href={href} className="arrow-link">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

function ThemeRail() {
  const themes = [
    ["Budget builds", "Under $1,000, still plays everything", "/shop?max=1000", BudgetArt],
    ["4K gaming", "High-refresh, high-resolution rigs", "/shop?sub=gaming-pcs&min=1800", FourKArt],
    ["Desk upgrades", "Monitors, boards and mice", "/shop?category=peripherals", DeskArt],
    ["PC parts", "Build it your way, one part at a time", "/shop?category=pc-parts-and-components", PartsArt],
  ] as const;
  return (
    <section className="mx-auto max-w-[1480px] px-4 pt-20 lg:px-8 lg:pt-28">
      <SectionHead title="Pick a lane" lede="Not sure where to start? Start with what you want it to do." />
      <Reveal stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {themes.map(([title, body, href, Art]) => (
          <Link
            key={title}
            href={href}
            className="card-lift wiggle-on-hover group relative flex flex-col overflow-hidden rounded-[16px] border border-line bg-card p-6"
          >
            <Art className="h-[72px] w-[72px]" />
            <h3 className="display mt-6 text-[24px]">{title}</h3>
            <p className="mt-1.5 text-[14px] text-muted">{body}</p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink transition-colors group-hover:text-deal">
              Shop this
              <Icon name="arrow-right" size={15} strokeWidth={2.4} className="transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </Reveal>
    </section>
  );
}

function Rail({
  index,
  title,
  lede,
  href,
  items,
  hot,
}: {
  index: string;
  title: string;
  lede?: string;
  href: string;
  items: Awaited<ReturnType<typeof queryListings>>["items"];
  hot?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-[1480px] px-4 pt-20 lg:px-8 lg:pt-28">
      <SectionHead index={index} title={title} lede={lede} href={href} hot={hot} />
      <Reveal stagger className="rail">
        {items.slice(0, 8).map((l) => (
          <ProductCard key={l.id} listing={l} />
        ))}
      </Reveal>
    </section>
  );
}

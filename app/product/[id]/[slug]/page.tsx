import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Listing } from "@/lib/types";
import { getListing, getRelated, queryListings } from "@/lib/data";
import { money, timeAgo } from "@/lib/format";
import { findSub, findTop } from "@/lib/taxonomy";
import { BRAND } from "@/lib/brand";
import { getSubcategoryPriceStats, getRecentlySold } from "@/lib/market-data";
import { getPriceHistory } from "@/lib/price-history-data";
import { productSchema } from "@/lib/structured-data";
import { ViewerCount } from "@/components/ViewerCount";
import { FpsBar } from "@/components/SpecStrip";
import { SpecIcon } from "@/components/SpecIcon";
import { specNote, goodFor, pairingNote } from "@/lib/spec-notes";
import { estimatePerformance, SCORE_MAX, VALUE_MAX } from "@/lib/performance";
import { ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { BuyBox } from "@/components/BuyBox";
import { WishlistButton } from "@/components/WishlistButton";
import { RecentlySold } from "@/components/RecentlySold";
import { Icon } from "@/components/ui/Icon";

export const revalidate = 120;
export const dynamicParams = true;

/**
 * Prerender the current catalogue at build time so opening a listing is a
 * static file read, not a render. Anything newer than the last build still
 * works — it renders on demand once, then caches.
 */
export async function generateStaticParams() {
  const { items } = await queryListings({ perPage: 200 });
  return items.map((l) => ({ id: l.id, slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const l = await getListing(id);
  if (!l) return { title: "Listing not found" };
  return {
    title: `${l.title} — ${money(l.price)}`,
    description: l.description.slice(0, 160),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  const [related, priceStats, recentlySold, priceHistory] = await Promise.all([
    getRelated(listing, listing.categorySlug === "full-systems" ? 6 : 8),
    getSubcategoryPriceStats(listing.subcategorySlug),
    getRecentlySold({ subcategorySlug: listing.subcategorySlug, limit: 5 }),
    getPriceHistory(listing.id),
  ]);
  const sub = findSub(listing.subcategorySlug);
  const top = findTop(listing.categorySlug);

  const perf = estimatePerformance(listing);
  // Jawa-style 2x2: GPU | CPU on top, RAM | Storage below, whatever order the
  // seller entered them in. Anything else (PSU, VRAM…) goes in a second table.
  const KEY_ORDER = ["gpu", "cpu", "ram", "ssd", "storage"];
  const keySpecs = KEY_ORDER.map((k) => listing.specs.find((s) => s.label.toLowerCase() === k))
    .filter((s): s is Listing["specs"][number] => Boolean(s))
    .slice(0, 4);
  const otherSpecs = keySpecs.length >= 2 ? listing.specs.filter((s) => !keySpecs.includes(s)) : [];
  if (keySpecs.length < 2) keySpecs.splice(0, keySpecs.length, ...listing.specs);
  const gpuSpec = listing.specs.find((s) => ["gpu", "model"].includes(s.label.toLowerCase()))?.value ?? "";
  const res = perf && perf.kind !== "cpu" ? goodFor(gpuSpec || listing.title) : [];
  const cpuSpec = listing.specs.find((s) => s.label.toLowerCase() === "cpu")?.value ?? "";
  const pairing = perf?.kind === "system" ? pairingNote(gpuSpec, cpuSpec) : null;

  return (
    <div className="mx-auto max-w-[1480px] px-4 pb-8 pt-8 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productSchema(listing, `/product/${listing.id}/${listing.slug}`)),
        }}
      />
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted">
        <Link href="/shop" className="transition hover:text-ink">
          Marketplace
        </Link>
        {top && (
          <>
            <span aria-hidden="true" className="text-line-strong">/</span>
            <Link href={`/shop?category=${top.slug}`} className="transition hover:text-ink">
              {top.name}
            </Link>
          </>
        )}
        {sub && (
          <>
            <span aria-hidden="true" className="text-line-strong">/</span>
            <Link
              href={`/shop?category=${listing.categorySlug}&sub=${sub.slug}`}
              className="transition hover:text-ink"
            >
              {sub.name}
            </Link>
          </>
        )}
      </nav>

      {/*
        Two "columns" below, but each is `contents` on phones — that
        unwraps it from the box tree so its children become direct grid
        items alongside the other column's, letting `order-N` interleave
        title/gallery/buy-actions/specs/description into the phone reading
        order the brief specifies. At `lg:` each wrapper turns back into a
        real block and reclaims its own internal spacing (`lg:space-y-4` /
        `lg:mt-8`), which is what reproduces the desktop layout exactly as
        it was — one set of markup, no duplicated JSX per breakpoint.
      */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12">
        <div className="contents lg:block">
          <div className="order-2">
            <ProductGallery listing={listing} />
          </div>

          <section className="order-6 lg:mt-12">
            <SectionTitle>Full specification</SectionTitle>
            <dl className="spec-list mt-4">
              {[...keySpecs, ...otherSpecs].map((s) => {
                const note = specNote(s.label, s.value);
                return (
                  <div key={s.label} className="spec-item">
                    <span className="spec-item-icon">
                      <SpecIcon label={s.label} size={18} />
                    </span>
                    <dt className="spec-item-label">{s.label}</dt>
                    <dd className="spec-item-body">
                      <span className="spec-item-value">{s.value}</span>
                      {note && <span className="spec-item-note">{note}</span>}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ["Condition", listing.condition],
                ["Ships from", listing.location],
              ].map(([k, v]) => (
                <span key={k} className="detail-chip">
                  <span className="text-trust"><SpecIcon label={k} /></span>
                  <span className="text-muted">{k}</span>
                  <b className="font-semibold">{v}</b>
                </span>
              ))}
            </div>

            {(listing.benchmarkImages?.length ?? 0) > 0 && (
              <div className="mt-4">
                <p className="badge badge-green">
                  <Icon name="check-circle" size={14} /> Performance verified
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {listing.benchmarkImages!.map((src, i) => (
                    <a
                      key={src + i}
                      href={src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block h-24 w-32 overflow-hidden rounded-[10px] border border-line bg-chrome transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
                    >
                      <Image src={src} alt="Benchmark screenshot" fill sizes="128px" className="object-cover" />
                    </a>
                  ))}
                </div>
                <p className="spec mt-1.5 text-muted">
                  Seller-provided benchmark screenshots — not independently verified by {BRAND.name}.
                </p>
              </div>
            )}
          </section>

          <section className="order-7 lg:mt-12">
            <SectionTitle>From the seller</SectionTitle>
            <figure className="relative mt-4 rounded-[14px] border border-line bg-card p-6 pl-14 shadow-[var(--shadow-sm)]">
              <span aria-hidden="true" className="display absolute left-5 top-3 text-[54px] leading-none text-signal">&ldquo;</span>
              <blockquote className="max-w-2xl whitespace-pre-line text-[15px] leading-[1.7] text-ink-soft">
                {listing.description}
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-2 text-[13px] text-muted">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-[11px] font-bold text-paper">{listing.sellerName[0]}</span>
                {listing.sellerName}, {listing.location}
              </figcaption>
            </figure>
          </section>
        </div>

        <div className="contents lg:block lg:space-y-4">
          <div className="order-1">
            <div className="flex items-start justify-between gap-3">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted">
                <span className="badge badge-outline">{listing.brand}</span>
                <span>Listed {timeAgo(listing.createdAt)}</span>
                {listing.watchers > 0 && (
                  <span className="inline-flex items-center gap-1"><Icon name="eye" size={13} /> {listing.watchers} watching</span>
                )}
              </p>
              <WishlistButton id={listing.id} size="md" />
            </div>
            <h1 className="display mt-3 text-[clamp(28px,3vw,38px)] leading-[1.02]">
              {listing.title}
            </h1>
            <ViewerCount listingId={listing.id} />
          </div>

          {listing.fps1080p && (
            <div className="order-3 panel p-4">
              <FpsBar fps={listing.fps1080p} />
              <p className="mt-2 text-[12.5px] text-muted">
                Estimated from the GPU and CPU pairing across common titles.
              </p>
            </div>
          )}

          <div className="order-4">
            <BuyBox listing={listing} priceStats={priceStats} priceHistory={priceHistory} />
          </div>

          <div className="order-5 panel p-5">
            <h2 className="eyebrow">Seller</h2>
            <Link href={`/seller/${listing.sellerId}`} className="group mt-3 flex items-center gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-chrome-2 font-[family-name:var(--font-display)] text-[20px] font-bold text-[#f3efe6] transition group-hover:-rotate-6">
                {listing.sellerName[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-[15px] font-semibold transition group-hover:text-deal">
                  {listing.sellerName}
                  {listing.sellerVerified && (
                    <span className="badge badge-green">
                      <Icon name="shield" size={13} /> Verified
                    </span>
                  )}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-muted">
                  {listing.sellerReviewCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-ink-soft">
                      <Icon name="star" size={13} filled className="text-gold" />
                      {listing.sellerRating.toFixed(1)} ({listing.sellerReviewCount} reviews)
                    </span>
                  ) : (
                    "No reviews yet"
                  )}
                  <span>· {listing.sellerSales} sales</span>
                  <span>· {listing.location}</span>
                </p>
              </div>
              <Icon name="chevron-right" size={18} className="text-muted transition group-hover:translate-x-0.5" />
            </Link>
          </div>

          {perf && (
            <div className="order-5 panel p-5">
              <h2 className="eyebrow">Performance</h2>
              <div className="mt-3 flex items-baseline justify-between text-[13.5px]">
                <span className="text-muted">{perf.kind === "system" ? "Total Performance" : perf.kind === "gpu" ? "GPU Performance" : "CPU Performance"}</span>
                <span className="font-semibold tabular-nums">{perf.score.toLocaleString()}</span>
              </div>
              <div className="perf-bar mt-1.5"><span className="perf-fill perf-score" style={{ width: `${Math.min(100, (perf.score / SCORE_MAX) * 100)}%` }} /></div>
              <div className="mt-3 flex items-baseline justify-between text-[13.5px]">
                <span className="text-muted">Price-to-Performance</span>
                <span className="font-semibold tabular-nums">{perf.value.toFixed(1)}</span>
              </div>
              <div className="perf-bar mt-1.5"><span className="perf-fill perf-value" style={{ width: `${Math.min(100, (perf.value / VALUE_MAX) * 100)}%` }} /></div>
              {res.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[12.5px]">
                  <span className="text-muted">Comfortable at</span>
                  {res.map((r) => (
                    <span key={r} className="badge badge-green">{r}</span>
                  ))}
                </div>
              )}
              {pairing && (
                <p className="alert alert-warn mt-3 !text-[12.5px]"><Icon name="info" size={15} />{pairing}</p>
              )}
              <p className="mt-3 text-[12px] leading-snug text-muted">
                Estimates from the listed parts using typical benchmark results. Higher Price-to-Performance means more performance per dollar.
              </p>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="display text-[clamp(26px,3vw,38px)]">More {sub?.name}</h2>
            {sub && (
              <Link href={`/shop?category=${listing.categorySlug}&sub=${sub.slug}`} className="arrow-link">
                See all
              </Link>
            )}
          </div>
          <div
            className={`grid ${
              listing.categorySlug === "full-systems"
                ? "grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
            }`}
          >
            {related.map((l) => (
              <ProductCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}

      <RecentlySold items={recentlySold} title={`Recently sold — ${sub?.name ?? "this category"}`} />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.09em] text-muted">
      {children}
      <span className="h-px flex-1 bg-line" aria-hidden="true" />
    </h2>
  );
}

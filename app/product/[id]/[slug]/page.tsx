import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Listing } from "@/lib/types";
import { getListing, getRelated } from "@/lib/data";
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
import { connection } from "next/server";


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
  // Rendered per request, from data that's cached and invalidated by tag
  // (see lib/data.ts). Timed ISR here meant the first visitor after any
  // change got the previous copy — the "only a hard refresh shows it" bug.
  await connection();
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
    <div className="mx-auto max-w-[1560px] px-4 py-8 lg:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productSchema(listing, `/product/${listing.id}/${listing.slug}`)),
        }}
      />
      <nav className="spec mb-5 text-muted">
        <Link href="/shop" className="hover:text-ink">
          Marketplace
        </Link>
        {top && (
          <>
            {" / "}
            <Link href={`/shop?category=${top.slug}`} className="hover:text-ink">
              {top.name}
            </Link>
          </>
        )}
        {sub && (
          <>
            {" / "}
            <Link
              href={`/shop?category=${listing.categorySlug}&sub=${sub.slug}`}
              className="hover:text-ink"
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
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="contents lg:block">
          <div className="order-2">
            <ProductGallery listing={listing} />
          </div>

          <section className="order-6 lg:mt-8">
            <h2 className="eyebrow">Full specification</h2>
            <dl className="spec-list mt-3">
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
                  <SpecIcon label={k} />
                  <span className="text-muted">{k}</span>
                  <b className="font-semibold">{v}</b>
                </span>
              ))}
            </div>

            {(listing.benchmarkImages?.length ?? 0) > 0 && (
              <div className="mt-4">
                <p className="spec inline-block rounded-lg bg-good/10 px-2 py-1 font-semibold text-good">
                  ✓ Performance Verified
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {listing.benchmarkImages!.map((src, i) => (
                    <a
                      key={src + i}
                      href={src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block h-24 w-32 overflow-hidden rounded-lg border border-line bg-ink"
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

          <section className="order-7 lg:mt-8">
            <h2 className="eyebrow">From the seller</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed">
              {listing.description}
            </p>
          </section>
        </div>

        <div className="contents lg:block lg:space-y-4">
          <div className="order-1">
            <div className="flex items-start justify-between gap-3">
              <p className="eyebrow">
                {listing.brand} · listed {timeAgo(listing.createdAt)}
                {listing.watchers > 0 && ` · ${listing.watchers} watching`}
              </p>
              <WishlistButton id={listing.id} />
            </div>
            <h1 className="display mt-2 text-3xl leading-tight">
              {listing.title}
            </h1>
            <ViewerCount listingId={listing.id} />
          </div>

          {listing.fps1080p && (
            <div className="order-3 rounded-card border border-line bg-card p-4">
              <FpsBar fps={listing.fps1080p} />
              <p className="spec mt-2 text-muted">
                Estimated from the GPU and CPU pairing across common titles.
              </p>
            </div>
          )}

          <div className="order-4">
            <BuyBox listing={listing} priceStats={priceStats} priceHistory={priceHistory} />
          </div>

          <div className="order-5 rounded-card border border-line bg-card p-5">
            <h2 className="eyebrow">Seller</h2>
            <Link href={`/seller/${listing.sellerId}`} className="mt-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-trust text-base font-semibold text-white">
                {listing.sellerName[0]}
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold hover:text-trust">
                  {listing.sellerName}
                  {listing.sellerVerified && (
                    <span className="spec rounded-lg bg-trust-soft px-1.5 py-0.5 font-semibold text-trust">
                      Verified
                    </span>
                  )}
                </p>
                <p className="spec text-muted">
                  {listing.sellerReviewCount > 0
                    ? `★ ${listing.sellerRating.toFixed(1)} (${listing.sellerReviewCount} reviews)`
                    : "No reviews yet"}{" "}
                  · {listing.sellerSales} sales · {listing.location}
                </p>
              </div>
            </Link>
          </div>

          {perf && (
            <div className="order-5 rounded-card border border-line bg-card p-5">
              <h2 className="eyebrow">Performance</h2>
              <div className="mt-3 flex items-baseline justify-between text-sm">
                <span className="text-muted">{perf.kind === "system" ? "Total Performance" : perf.kind === "gpu" ? "GPU Performance" : "CPU Performance"}</span>
                <span className="font-semibold tabular-nums">{perf.score.toLocaleString()}</span>
              </div>
              <div className="perf-bar mt-1.5"><span className="perf-fill perf-score" style={{ width: `${Math.min(100, (perf.score / SCORE_MAX) * 100)}%` }} /></div>
              <div className="mt-3 flex items-baseline justify-between text-sm">
                <span className="text-muted">Price-to-Performance</span>
                <span className="font-semibold tabular-nums">{perf.value.toFixed(1)}</span>
              </div>
              <div className="perf-bar mt-1.5"><span className="perf-fill perf-value" style={{ width: `${Math.min(100, (perf.value / VALUE_MAX) * 100)}%` }} /></div>
              {res.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted">Comfortable at</span>
                  {res.map((r) => (
                    <span key={r} className="rounded-full bg-trust-soft px-2.5 py-1 font-semibold text-trust">{r}</span>
                  ))}
                </div>
              )}
              {pairing && (
                <p className="mt-3 rounded-lg bg-deal-soft px-3 py-2 text-xs leading-snug text-ink">{pairing}</p>
              )}
              <p className="mt-3 text-xs leading-snug text-muted">
                Estimates from the listed parts using typical benchmark results. Higher Price-to-Performance means more performance per dollar.
              </p>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="display mb-4 text-3xl">More {sub?.name}</h2>
          <div
            className={`grid ${
              listing.categorySlug === "full-systems"
                ? "grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
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

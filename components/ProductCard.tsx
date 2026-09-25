"use client";
import { useState } from "react";
import Link from "next/link";
import type { Listing } from "@/lib/types";
import { money } from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { estimatePerformance, SCORE_MAX, VALUE_MAX } from "@/lib/performance";
import { WishlistButton } from "./WishlistButton";
import { SpecIcon } from "./SpecIcon";
import { Icon } from "./ui/Icon";

export function ProductCard({ listing }: { listing: Listing }) {
  const save = listing.compareAt ? listing.compareAt - listing.price : 0;
  const pct = listing.compareAt
    ? Math.round((save / listing.compareAt) * 100)
    : 0;
  // Seeded from `!listing.image` so the very first paint guesses right in
  // the common case, then corrected by ProductImage once it knows the
  // real outcome — a src that's set but 404s (a demo listing with no seed
  // photo, a broken storage URL) falls back too, just asynchronously.
  const [isStockPhoto, setIsStockPhoto] = useState(!listing.image);
  // Card-level photo browsing: arrows step through the seller's photos
  // without opening the listing. The arrows sit inside the card's <Link>,
  // so each click stops the navigation it would otherwise trigger.
  const photos = [listing.image, ...(listing.images ?? [])].filter((p): p is string => Boolean(p));
  const [shot, setShot] = useState(0);
  // Extra photos only load once someone shows interest in this card
  // (hover/focus/touch), so the shop page doesn't download every photo of
  // every listing up front, but they're ready before the first click.
  const [warm, setWarm] = useState(false);
  const step = (e: React.MouseEvent, dir: number) => {
    e.preventDefault();
    e.stopPropagation();
    setShot((v) => (v + dir + photos.length) % photos.length);
  };

  return (
    <Link
      href={`/product/${listing.id}/${listing.slug}`}
      onMouseEnter={() => setWarm(true)}
      onFocus={() => setWarm(true)}
      onTouchStart={() => setWarm(true)}
      className="listing-card group"
    >
      <div className="listing-photo">
        {/* All photos sit side by side in one strip that slides, so moving to
            the next photo is a smooth slide with the image already loaded,
            rather than a fresh image popping in. */}
        <div className="card-track" style={{ transform: `translateX(-${shot * 100}%)` }}>
          {(photos.length ? photos : [listing.image]).map((src, i) => (
            <div key={i} className="card-slide" aria-hidden={i !== shot || undefined}>
              {(i === 0 || warm) && <ProductImage
                eager={i > 0}
                src={src}
                alt={i === 0 ? listing.title : ""}
                category={listing.category}
                seed={i ? `${listing.id}-${i}` : listing.id}
                className="h-full w-full"
                showStockBadge={false}
                onFallback={i === 0 ? setIsStockPhoto : undefined}
              />}
            </div>
          ))}
        </div>
        {photos.length > 1 && (
          <>
            <button type="button" aria-label="Previous photo" onClick={(e) => step(e, -1)} className="card-arrow left-2">
              <Icon name="chevron-left" size={15} strokeWidth={2.6} />
            </button>
            <button type="button" aria-label="Next photo" onClick={(e) => step(e, 1)} className="card-arrow right-2">
              <Icon name="chevron-right" size={15} strokeWidth={2.6} />
            </button>
            <div className="card-dots" aria-hidden="true">
              {photos.slice(0, 8).map((_, i) => (
                <span key={i} className={i === shot ? "is-on" : ""} />
              ))}
            </div>
          </>
        )}
        {pct > 0 && (
          <span className="sticker absolute left-2.5 top-2.5 z-[3]">−{pct}%</span>
        )}
        <WishlistButton id={listing.id} className="absolute right-2 top-2 z-[3]" />
        {/* Fixed light chip regardless of theme, so its text is fixed dark
            too — the photo underneath doesn't change with the theme. */}
        <span className="condition-chip">
          <i data-c={listing.condition} aria-hidden="true" />
          {listing.condition}
          {isStockPhoto && <span className="font-medium text-[#6b665a]">· Stock photo</span>}
        </span>
        {listing.watchers > 120 && !isStockPhoto && (
          <span className="absolute bottom-2 right-2 z-[2] inline-flex items-center gap-1 rounded-md bg-[#17150f]/80 px-2 py-1 text-[11.5px] font-semibold text-white backdrop-blur-sm">
            <Icon name="eye" size={13} />
            {listing.watchers}
          </span>
        )}
      </div>

      <div className="listing-body">
        <h3 className="line-clamp-2 text-[14.5px] font-semibold leading-snug transition-colors group-hover:text-deal">
          {listing.title}
        </h3>
        <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-muted">
          <span className="truncate">{listing.sellerName}</span>
          {listing.sellerVerified && <VerifiedTick />}
          {listing.sellerReviewCount > 0 && (
            <span className="inline-flex shrink-0 items-center gap-0.5 font-medium text-ink-soft">
              <Icon name="star" size={12} filled className="text-gold" />
              {listing.sellerRating.toFixed(1)}
              <span className="text-muted">({listing.sellerReviewCount})</span>
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="listing-price">{money(listing.price)}</span>
          {listing.compareAt && (
            <span className="text-[12.5px] text-muted line-through decoration-deal/60">{money(listing.compareAt)}</span>
          )}
          {listing.shipsFree && (
            <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-good">
              <Icon name="truck" size={14} />
              Free
            </span>
          )}
        </div>

        <SpecGrid listing={listing} />
        <PerfBars listing={listing} />
      </div>
    </Link>
  );
}

function VerifiedTick() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-label="Verified seller" className="shrink-0">
      <path d="M12 1.5l2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3 1 3-2.6 1.9-1 3-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3L2.6 15.8l1-3-1-3 2.6-1.9 1-3 3.2.1Z" fill="var(--color-trust)" />
      <path d="M7.5 12.4l3 3L16.5 9" fill="none" stroke="var(--color-card)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Jawa-style 2x2 grid of the parts that matter most for this kind of listing. */
export function SpecGrid({ listing }: { listing: Listing }) {
  const wanted = ["gpu", "cpu", "ram", "ssd", "storage"];
  const byLabel = (x: string) => listing.specs.find((s) => s.label.toLowerCase() === x);
  let picks = wanted.map(byLabel).filter(Boolean) as Listing["specs"];
  // Condition notes ("Verified by seller") aren't parts; they belong on the listing page.
  if (picks.length < 2) picks = listing.specs.filter((s) => s.label.toLowerCase() !== "condition");
  picks = picks.slice(0, 4);
  if (!picks.length) return null;
  return (
    <dl className="spec-grid mt-3">
      {picks.map((s) => (
        <div key={s.label} title={`${s.label}: ${s.value}`}>
          <SpecIcon label={s.label} />
          <dt className="sr-only">{s.label}</dt>
          <dd className="line-clamp-2 leading-tight">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PerfBars({ listing }: { listing: Listing }) {
  const perf = estimatePerformance(listing);
  if (!perf) return null;
  const scoreLabel = perf.kind === "system" ? "Total Performance" : perf.kind === "gpu" ? "GPU Performance" : "CPU Performance";
  return (
    <div className="mt-auto pt-3.5" title="Estimated from the listed parts using typical benchmark results">
      <div className="flex items-baseline justify-between text-[12px]">
        <span className="truncate text-muted"><span className="p2p-long">{scoreLabel}</span><span className="p2p-short">Performance</span></span>
        <span className="shrink-0 pl-2 font-semibold tabular-nums text-ink">{perf.score.toLocaleString()}</span>
      </div>
      <div className="perf-bar mt-1">
        <span className="perf-fill perf-score" style={{ width: `${Math.min(100, (perf.score / SCORE_MAX) * 100)}%` }} />
      </div>
      <div className="mt-2 flex items-baseline justify-between text-[12px]">
        <span className="truncate text-muted"><span className="p2p-long">Price-to-Performance</span><span className="p2p-short">Value score</span></span>
        <span className="shrink-0 pl-2 font-semibold tabular-nums text-ink">{perf.value.toFixed(1)}</span>
      </div>
      <div className="perf-bar mt-1">
        <span className="perf-fill perf-value" style={{ width: `${Math.min(100, (perf.value / VALUE_MAX) * 100)}%` }} />
      </div>
    </div>
  );
}

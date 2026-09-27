"use client";
import { useState } from "react";
import Link from "next/link";
import type { Listing } from "@/lib/types";
import { money } from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { WishlistButton } from "./WishlistButton";
import { SpecIcon } from "./SpecIcon";
import { tierClass } from "@/lib/condition-tier";

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
      className={`listing-card ${tierClass(listing.condition)} group flex flex-col overflow-hidden rounded-card`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-chrome">
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
                className="h-full w-full transition duration-500 group-hover:scale-[1.06]"
                showStockBadge={false}
                onFallback={i === 0 ? setIsStockPhoto : undefined}
              />}
            </div>
          ))}
        </div>
        {photos.length > 1 && (
          <>
            <button type="button" aria-label="Previous photo" onClick={(e) => step(e, -1)} className="card-arrow left-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
            <button type="button" aria-label="Next photo" onClick={(e) => step(e, 1)} className="card-arrow right-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
            </button>
            <div className="card-dots" aria-hidden="true">
              {photos.slice(0, 8).map((_, i) => (
                <span key={i} className={i === shot ? "is-on" : ""} />
              ))}
            </div>
          </>
        )}
        {/* Condition as a colour-coded tier, with any price drop under it. */}
        <div className="absolute left-2 top-2 z-[5] flex flex-col items-start gap-1">
          <span className="tier-badge">{listing.condition}</span>
          {pct > 0 && (
            <span className="spec rounded-full bg-deal-strong px-2 py-0.5 font-semibold text-white">
              ▼ {pct}% off
            </span>
          )}
        </div>
        <WishlistButton id={listing.id} className="absolute right-2 top-2" />
        {/* Fixed dark glass over the photo in both themes, so the text is
            fixed white rather than text-ink (which flips per theme). */}
        {isStockPhoto && (
          <span className="spec absolute bottom-2 left-2 rounded-lg bg-black/60 px-1.5 py-1 font-medium text-white/85 backdrop-blur-sm">
            Stock photo
          </span>
        )}
        {listing.watchers > 120 && !isStockPhoto && (
          <span className="spec absolute bottom-2 right-2 rounded-lg bg-black/70 px-1.5 py-1 font-medium text-white backdrop-blur-sm">
            {listing.watchers} watching
          </span>
        )}
      </div>

      {/* Title, price, the facts a buyer scans for, then who's selling.
          Parts grids and performance bars live on the listing page — on
          a card in a grid of 24 they were noise. */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{listing.title}</h3>
        {/* Price and delivery wrap rather than truncate, however long. */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="display whitespace-nowrap text-xl tabular-nums">{money(listing.price)}</span>
          {listing.compareAt && (
            <span className="whitespace-nowrap text-xs text-muted line-through tabular-nums">
              {money(listing.compareAt)}
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed text-muted">
          {listing.location}
          {listing.shipsFree && <span className="font-medium text-good">{listing.location ? " · " : ""}Free shipping</span>}
        </p>
        <KeySpecs listing={listing} />
        <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5 text-xs text-muted">
          <span className="truncate">{listing.sellerName}</span>
          {listing.sellerVerified && <VerifiedTick />}
          {listing.sellerReviewCount > 0 && (
            <span className="ml-auto shrink-0 text-trust tabular-nums">
              ★ {listing.sellerRating.toFixed(1)} ({listing.sellerReviewCount})
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function VerifiedTick() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-label="Verified seller" className="shrink-0">
      <circle cx="12" cy="12" r="11" fill="var(--color-icon)" />
      <path d="M7 12.4l3.2 3.2L17 8.8" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
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

/** The two parts that matter most, on one line (e.g. "RTX 4090 24GB · Core i5-12400F"). */
function KeySpecs({ listing }: { listing: Listing }) {
  const wanted = ["gpu", "cpu", "ram", "ssd", "storage"];
  const picks = wanted
    .map((x) => listing.specs.find((s) => s.label.toLowerCase() === x))
    .filter((s): s is Listing["specs"][number] => Boolean(s))
    .slice(0, 2);
  if (!picks.length) return null;
  return <p className="truncate text-xs text-ink/80">{picks.map((p) => p.value).join(" · ")}</p>;
}

"use client";
import { useState } from "react";
import Link from "next/link";
import type { Listing } from "@/lib/types";
import { money } from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { WishlistButton } from "./WishlistButton";
import { SpecIcon } from "./SpecIcon";

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
      className="group flex flex-col overflow-hidden rounded-card border border-line bg-card transition duration-200 hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ink">
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
                className="h-full w-full transition duration-500 group-hover:scale-[1.04]"
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
        {pct > 0 && (
          <span className="spec absolute left-2 top-2 rounded-lg bg-deal px-1.5 py-1 font-semibold text-white">
            {pct}% off
          </span>
        )}
        <WishlistButton id={listing.id} className="absolute right-2 top-2" />
        {/* Background is a fixed white regardless of theme, so the text
            has to be fixed dark too — text-ink flips light in dark mode
            and would land as near-invisible light-on-white. */}
        {isStockPhoto && (
          <span className="spec absolute bottom-2 left-2 rounded-lg bg-white/92 px-1.5 py-1 font-medium text-[#111111]">
            Stock photo
          </span>
        )}
        {listing.watchers > 120 && !isStockPhoto && (
          <span className="spec absolute bottom-2 right-2 rounded-lg bg-ink/85 px-1.5 py-1 font-medium text-white">
            {listing.watchers} watching
          </span>
        )}
      </div>

      {/* Title, price, the facts a buyer scans for, then who's selling.
          Parts grids and performance bars live on the listing page — on
          a card in a grid of 24 they were noise. */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{listing.title}</h3>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="display text-xl">{money(listing.price)}</span>
          {listing.compareAt && (
            <span className="text-xs text-muted">
              <span className="line-through">{money(listing.compareAt)}</span>{" "}
              <span className="font-semibold text-deal">{pct}% off</span>
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted">
          {[listing.condition, listing.location].filter(Boolean).join(" · ")}
          {listing.shipsFree && <span className="font-medium text-good"> · Free shipping</span>}
        </p>
        <KeySpecs listing={listing} />
        <div className="mt-auto flex items-center gap-1.5 border-t border-line pt-2.5 text-xs text-muted">
          <span className="truncate">{listing.sellerName}</span>
          {listing.sellerVerified && <VerifiedTick />}
          {listing.sellerReviewCount > 0 && (
            <span className="ml-auto shrink-0 text-good">
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

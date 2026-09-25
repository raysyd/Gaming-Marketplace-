"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Category } from "@/lib/types";
import { CATEGORY_PHOTOS } from "@/lib/category-photos";

// Every caller already sizes this via a fixed-dimension wrapper (h-14
// w-20, aspect-[4/3], etc.) — `fill` reads that ambient size rather than
// needing per-call-site width/height plumbing. `sizes` can't be exact for
// a component reused everywhere from a 56x80 thumbnail to a full gallery
// hero, so this is a reasonable middle ground rather than the wasteful
// 100vw default `fill` falls back to when it's omitted entirely.
const SIZES = "(max-width: 640px) 100vw, 400px";

/**
 * Shows the seller's photo when there is one. Falls back to a real,
 * licensed category stock photo if the field is empty or the file 404s,
 * so a listing never renders broken — tagged with a visible "Stock photo"
 * badge so it's never mistaken for an actual photo of this specific used
 * item (that distinction is the whole point of the badge; don't drop it
 * even if the fallback art changes again later).
 */
export function ProductImage({
  src,
  alt,
  category,
  seed,
  className = "",
  showStockBadge = true,
  onFallback,
  eager = false,
}: {
  src?: string;
  alt: string;
  category: Category;
  seed: string;
  className?: string;
  /**
   * ProductCard already fills all four image corners with its own badges
   * (discount, wishlist, condition, watchers) — set this false there and
   * fold the notice into one of those instead, rather than overlapping.
   */
  showStockBadge?: boolean;
  /**
   * Fires with the real fallback state once it's known. A caller can't
   * reliably infer this from `!src` alone — a `src` that's set but 404s
   * (e.g. a demo listing pointing at a seed photo that was never added)
   * falls back too, just asynchronously. ProductCard uses this to keep
   * its own "Stock photo" notice honest instead of guessing from `src`.
   */
  onFallback?: (isFallback: boolean) => void;
  /** Load now instead of lazily — for photos about to slide into view in ProductCard. */
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const isFallback = !src || failed;

  useEffect(() => {
    // For a same-origin 404 the browser can finish loading (and error out)
    // before React hydrates and attaches onError below — a real race, not
    // a theoretical one: it reproduces every time on a fast connection.
    // That leaves `failed` stuck at false forever with a permanently
    // broken image, no fallback ever shown. Catch that already-failed
    // state on mount; onError still covers failures after this point.
    // next/image forwards `ref` to the underlying <img> DOM node, so this
    // check is unchanged from the plain-<img> version.
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth === 0) setFailed(true);
  }, [src]);

  useEffect(() => {
    onFallback?.(isFallback);
  }, [isFallback, onFallback]);

  // `className` establishes THIS component's own box in some callers
  // (e.g. "aspect-[4/3] w-full" with no separately-sized parent) and
  // relies on an outer wrapper for it in others (e.g. plain "h-full
  // w-full" inside a fixed-size div) — either way, it was always applied
  // to the element that defines the box, which is now this wrapper `div`
  // rather than the `<img>` itself. The `fill` image inside only ever
  // needs `relative` from its parent and stays unstyled beyond
  // `object-cover`.
  if (isFallback)
    return (
      <div className={`relative ${className}`}>
        <Image
          src={CATEGORY_PHOTOS[category]}
          alt={`${category} — stock photo, not the actual item`}
          fill
          sizes={SIZES}
          loading={eager ? "eager" : "lazy"}
          className="object-cover"
        />
        {showStockBadge && (
          <span className="spec absolute bottom-2 right-2 rounded-lg bg-ink/85 px-1.5 py-1 font-medium text-white">
            Stock photo
          </span>
        )}
      </div>
    );

  return (
    <div className={`relative ${className}`}>
      <Image
        ref={imgRef}
        src={src}
        alt={alt}
        fill
        sizes={SIZES}
        loading={eager ? "eager" : "lazy"}
        onError={() => setFailed(true)}
        className="object-cover"
      />
    </div>
  );
}

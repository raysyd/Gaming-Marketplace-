"use client";
import { useEffect, useRef, useState } from "react";
import type { Category } from "@/lib/types";
import { CATEGORY_PHOTOS } from "@/lib/category-photos";

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
}) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const isFallback = !src || failed;

  useEffect(() => {
    // For a same-origin 404 the browser can finish loading (and error out)
    // before React hydrates and attaches onError below — a real race, not
    // a theoretical one: it reproduces every time on a fast connection.
    // That leaves `failed` stuck at false forever with a permanently
    // broken <img>, no fallback ever shown. Catch that already-failed
    // state on mount; onError still covers failures after this point.
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth === 0) setFailed(true);
  }, [src]);

  useEffect(() => {
    onFallback?.(isFallback);
  }, [isFallback, onFallback]);

  if (isFallback)
    return (
      <div className="relative h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CATEGORY_PHOTOS[category]}
          alt={`${category} — stock photo, not the actual item`}
          className={`object-cover ${className}`}
        />
        {showStockBadge && (
          <span className="spec absolute bottom-2 right-2 rounded bg-ink/85 px-1.5 py-1 font-medium text-white">
            Stock photo
          </span>
        )}
      </div>
    );

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}

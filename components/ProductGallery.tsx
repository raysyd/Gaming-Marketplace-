"use client";
import { useState } from "react";
import type { Listing } from "@/lib/types";
import { ProductImage } from "./ProductImage";

export function ProductGallery({ listing }: { listing: Listing }) {
  const photos = [listing.image, ...(listing.images ?? [])].filter(
    (p): p is string => Boolean(p)
  );
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="overflow-hidden rounded-[10px] border border-line bg-ink">
        <ProductImage
          src={photos[active]}
          alt={listing.title}
          category={listing.category}
          seed={`${listing.id}-${active}`}
          className="aspect-[4/3] w-full"
        />
      </div>

      {photos.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {photos.slice(0, 8).map((src, i) => (
            <button
              key={src + i}
              onClick={() => setActive(i)}
              aria-label={`Photo ${i + 1} of ${photos.length}`}
              className={`overflow-hidden rounded border bg-ink transition ${
                i === active ? "border-ink" : "border-line opacity-70 hover:opacity-100"
              }`}
            >
              <ProductImage
                src={src}
                alt=""
                category={listing.category}
                seed={`${listing.id}-t${i}`}
                className="aspect-[4/3] w-full"
              />
            </button>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <p className="spec mt-2 text-muted">
          This seller hasn&apos;t added photos yet. Message them and ask for some
          before you buy.
        </p>
      )}
    </div>
  );
}

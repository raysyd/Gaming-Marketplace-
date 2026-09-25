"use client";
import { useState } from "react";
import type { Listing } from "@/lib/types";
import { ProductImage } from "./ProductImage";
import { Icon } from "./ui/Icon";

export function ProductGallery({ listing }: { listing: Listing }) {
  const photos = [listing.image, ...(listing.images ?? [])].filter(
    (p): p is string => Boolean(p)
  );
  const [active, setActive] = useState(0);
  const step = (dir: number) => setActive((v) => (v + dir + photos.length) % photos.length);

  return (
    <div>
      <div
        className="group relative overflow-hidden rounded-[16px] border border-line bg-chrome shadow-[var(--shadow-sm)]"
        onKeyDown={(e) => {
          if (photos.length < 2) return;
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
      >
        <div key={active} className="gallery-swap">
          <ProductImage
            src={photos[active]}
            alt={listing.title}
            category={listing.category}
            seed={`${listing.id}-${active}`}
            className="aspect-[4/3] w-full"
            eager
          />
        </div>
        {photos.length > 1 && (
          <>
            <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="card-arrow left-3 !h-10 !w-10 !-mt-5">
              <Icon name="chevron-left" size={18} strokeWidth={2.4} />
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Next photo" className="card-arrow right-3 !h-10 !w-10 !-mt-5">
              <Icon name="chevron-right" size={18} strokeWidth={2.4} />
            </button>
            <span className="tag-label absolute left-3 top-3 rounded-md bg-[#17150f]/75 px-2 py-1 text-white backdrop-blur-sm">
              {active + 1} / {photos.length}
            </span>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {photos.slice(0, 8).map((src, i) => (
            <button
              key={src + i}
              onClick={() => setActive(i)}
              aria-label={`Photo ${i + 1} of ${photos.length}`}
              aria-current={i === active || undefined}
              className={`overflow-hidden rounded-[10px] border-2 bg-chrome transition ${
                i === active ? "border-signal" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <ProductImage
                src={src}
                alt=""
                category={listing.category}
                seed={`${listing.id}-t${i}`}
                className="aspect-[4/3] w-full"
                showStockBadge={false}
              />
            </button>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <p className="alert alert-warn mt-3">
          <Icon name="camera" size={16} />
          This seller hasn&apos;t added photos yet. Message them and ask for some
          before you buy.
        </p>
      )}
    </div>
  );
}

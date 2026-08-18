import Link from "next/link";
import type { Listing } from "@/lib/types";
import { money } from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { SpecStrip } from "./SpecStrip";
import { WishlistButton } from "./WishlistButton";

export function ProductCard({ listing }: { listing: Listing }) {
  const save = listing.compareAt ? listing.compareAt - listing.price : 0;
  const pct = listing.compareAt
    ? Math.round((save / listing.compareAt) * 100)
    : 0;

  return (
    <Link
      href={`/product/${listing.id}/${listing.slug}`}
      className="card-hover group flex flex-col overflow-hidden rounded-[10px] border border-line bg-card transition hover:border-trust/40"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ink">
        <ProductImage
          src={listing.image}
          alt={listing.title}
          category={listing.category}
          seed={listing.id}
          className="h-full w-full transition duration-500 group-hover:scale-[1.04]"
        />
        {pct > 0 && (
          <span className="spec absolute left-2 top-2 rounded bg-deal px-1.5 py-1 font-semibold text-white">
            {pct}% off
          </span>
        )}
        <WishlistButton id={listing.id} className="absolute right-2 top-2" />
        <span className="spec absolute bottom-2 left-2 rounded bg-white/92 px-1.5 py-1 font-medium text-ink">
          {listing.condition}
        </span>
        {listing.watchers > 120 && (
          <span className="spec absolute bottom-2 right-2 rounded bg-ink/85 px-1.5 py-1 font-medium text-white">
            {listing.watchers} watching
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-[13.5px] font-semibold leading-snug">
          {listing.title}
        </h3>
        <SpecStrip specs={listing.specs} max={3} />
        <div className="mt-auto flex items-end justify-between pt-1">
          <div>
            <div className="display text-[19px]">{money(listing.price)}</div>
            {listing.compareAt && (
              <div className="spec text-muted line-through">
                {money(listing.compareAt)}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="spec flex items-center justify-end gap-1 text-muted">
              {listing.sellerVerified && (
                <span className="text-trust" title="Verified seller">
                  ✓
                </span>
              )}
              {listing.sellerName}
            </div>
            <div className="spec font-medium text-good">
              ★ {listing.sellerRating.toFixed(1)} · {listing.sellerSales}
            </div>
          </div>
        </div>
        {listing.shipsFree && <div className="spec text-good">Free shipping</div>}
      </div>
    </Link>
  );
}

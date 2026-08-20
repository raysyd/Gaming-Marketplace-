import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getListing, getRelated, queryListings } from "@/lib/data";
import { money, timeAgo } from "@/lib/format";
import { findSub, findTop } from "@/lib/taxonomy";
import { FpsBar } from "@/components/SpecStrip";
import { ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { BuyBox } from "@/components/BuyBox";
import { WishlistButton } from "@/components/WishlistButton";

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

  const related = await getRelated(listing);
  const sub = findSub(listing.subcategorySlug);
  const top = findTop(listing.categorySlug);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
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
            <dl className="mt-3 overflow-hidden rounded-[10px] border border-line bg-card">
              {listing.specs.map((s, i) => (
                <div
                  key={s.label}
                  className={`flex justify-between px-4 py-2.5 ${i % 2 ? "bg-paper" : ""}`}
                >
                  <dt className="spec text-muted">{s.label}</dt>
                  <dd className="spec font-semibold">{s.value}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-line px-4 py-2.5">
                <dt className="spec text-muted">Condition</dt>
                <dd className="spec font-semibold">{listing.condition}</dd>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <dt className="spec text-muted">Ships from</dt>
                <dd className="spec font-semibold">{listing.location}</dd>
              </div>
            </dl>
          </section>

          <section className="order-7 lg:mt-8">
            <h2 className="eyebrow">From the seller</h2>
            <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed">
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
            <h1 className="display mt-2 text-[26px] leading-tight">
              {listing.title}
            </h1>
          </div>

          {listing.fps1080p && (
            <div className="order-3 rounded-[10px] border border-line bg-card p-4">
              <FpsBar fps={listing.fps1080p} />
              <p className="spec mt-2 text-muted">
                Estimated from the GPU and CPU pairing across common titles.
              </p>
            </div>
          )}

          <div className="order-4">
            <BuyBox listing={listing} />
          </div>

          <div className="order-5 rounded-[10px] border border-line bg-card p-5">
            <h2 className="eyebrow">Seller</h2>
            <Link href={`/seller/${listing.sellerId}`} className="mt-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-trust text-[15px] font-semibold text-white">
                {listing.sellerName[0]}
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[14px] font-semibold hover:text-trust">
                  {listing.sellerName}
                  {listing.sellerVerified && (
                    <span className="spec rounded bg-trust-soft px-1.5 py-0.5 font-semibold text-trust">
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
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="display mb-4 text-[24px]">More {sub?.name}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((l) => (
              <ProductCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

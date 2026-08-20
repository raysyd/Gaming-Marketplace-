import Link from "next/link";
import { notFound } from "next/navigation";
import { queryListings } from "@/lib/data";
import { getSellerReviews, getOneSellerStats } from "@/lib/reviews-data";
import { timeAgo } from "@/lib/format";
import { ProductCard } from "@/components/ProductCard";

export const revalidate = 60;

export default async function SellerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ items: listings }, reviews, stats] = await Promise.all([
    queryListings({ sellerId: id, perPage: 48 }),
    getSellerReviews(id),
    getOneSellerStats(id),
  ]);

  if (!listings.length && !reviews.length && !stats.salesCount) notFound();

  const sellerName = listings[0]?.sellerName ?? reviews[0]?.reviewerName ?? "Seller";
  const verified = listings.some((l) => l.sellerVerified);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-10">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-trust text-[20px] font-semibold text-white">
          {sellerName[0]}
        </div>
        <div>
          <h1 className="display flex items-center gap-2 text-[26px]">
            {sellerName}
            {verified && (
              <span className="spec rounded bg-trust-soft px-1.5 py-0.5 font-semibold text-trust">
                Verified
              </span>
            )}
          </h1>
          <p className="spec mt-1 text-muted">
            {stats.reviewCount > 0
              ? `★ ${stats.avgRating.toFixed(1)} (${stats.reviewCount} review${stats.reviewCount === 1 ? "" : "s"})`
              : "No reviews yet"}{" "}
            · {stats.salesCount} sale{stats.salesCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <h2 className="display mt-10 text-[20px]">Active listings</h2>
      {listings.length === 0 ? (
        <p className="mt-3 text-[14px] text-muted">Nothing listed right now.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => (
            <ProductCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      <h2 className="display mt-10 text-[20px]">Reviews</h2>
      {reviews.length === 0 ? (
        <p className="mt-3 text-[14px] text-muted">No reviews yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-[10px] border border-line bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13.5px] font-semibold">{r.reviewerName}</p>
                <p className="spec text-muted">{timeAgo(r.createdAt)}</p>
              </div>
              <p className="spec mt-1 font-medium text-good">
                {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)}
              </p>
              {r.body && <p className="mt-2 text-[14px] leading-relaxed">{r.body}</p>}
            </li>
          ))}
        </ul>
      )}

      <Link href="/shop" className="mt-8 inline-block text-[13px] font-semibold text-trust hover:underline">
        ← Back to marketplace
      </Link>
    </div>
  );
}

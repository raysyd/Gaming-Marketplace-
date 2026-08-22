import Link from "next/link";
import { notFound } from "next/navigation";
import { queryListings } from "@/lib/data";
import { getSellerReviews, getOneSellerStats } from "@/lib/reviews-data";
import { getProfile } from "@/lib/profile-data";
import { getPremiumPlan, isPremiumActive } from "@/lib/premium";
import { timeAgo } from "@/lib/format";
import { ProductCard } from "@/components/ProductCard";

export const revalidate = 60;

export default async function SellerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ items: listings }, reviews, stats, profile, plan] = await Promise.all([
    queryListings({ sellerId: id, perPage: 48 }),
    getSellerReviews(id),
    getOneSellerStats(id),
    getProfile(id),
    getPremiumPlan(),
  ]);
  const premium = isPremiumActive(profile?.premiumStatus);

  if (!listings.length && !reviews.length && !stats.salesCount && !profile) notFound();

  // profiles.display_name is the canonical name once a profile exists;
  // listings.seller_name/reviews.reviewer_name are only the pre-profile
  // fallback for an account that predates this or never finished
  // onboarding (a soft-launch/demo-data situation, not the normal path).
  const sellerName = profile?.displayName || profile?.username || listings[0]?.sellerName || reviews[0]?.reviewerName || "Seller";
  const location = [profile?.suburb, profile?.state].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-10">
      {profile?.bannerUrl && (
        <div className="-mt-2 mb-6 h-32 w-full overflow-hidden rounded-[10px] bg-trust-soft sm:h-44">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={profile.bannerUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-trust">
          {profile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-[20px] font-semibold text-white">
              {sellerName[0]}
            </span>
          )}
        </div>
        <div>
          <h1 className="display flex flex-wrap items-center gap-2 text-[26px]">
            {sellerName}
            {profile?.username && (
              <span className="spec font-normal text-muted">@{profile.username}</span>
            )}
            {profile?.verified && (
              <span className="spec rounded bg-trust-soft px-1.5 py-0.5 font-semibold text-trust">
                Verified
              </span>
            )}
            {/* Deliberately styled and worded differently from Verified —
                this is a paid badge, not an identity check, and the two
                must never look interchangeable. See lib/premium.ts. */}
            {premium && (
              <span className="spec rounded bg-deal-soft px-1.5 py-0.5 font-semibold text-deal">
                {plan.badgeLabel}
              </span>
            )}
          </h1>
          <p className="spec mt-1 text-muted">
            {stats.reviewCount > 0
              ? `★ ${stats.avgRating.toFixed(1)} (${stats.reviewCount} review${stats.reviewCount === 1 ? "" : "s"})`
              : "No reviews yet"}{" "}
            · {stats.salesCount} sale{stats.salesCount === 1 ? "" : "s"}
            {location && ` · ${location}`}
          </p>
          {profile?.bio && <p className="mt-2 max-w-lg text-[13.5px] text-muted">{profile.bio}</p>}
          {profile?.contactLink && (
            <a
              href={profile.contactLink}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="spec mt-2 inline-block font-semibold text-trust hover:underline"
            >
              {profile.contactLink.replace(/^https?:\/\//, "")} ↗
            </a>
          )}
        </div>
      </div>

      {profile?.policyNote && (
        <div className="mt-6 rounded-[10px] border border-line bg-card p-4">
          <p className="eyebrow">Shipping &amp; returns</p>
          <p className="mt-1.5 max-w-lg text-[13.5px] leading-relaxed text-muted">{profile.policyNote}</p>
        </div>
      )}

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

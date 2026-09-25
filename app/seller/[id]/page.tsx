import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { queryListings } from "@/lib/data";
import { getSellerReviews, getOneSellerStats } from "@/lib/reviews-data";
import { getProfile } from "@/lib/profile-data";
import { getPremiumPlan, isPremiumActive } from "@/lib/premium";
import { getSellerResponseMinutes, getRepeatBuyerIds, getRecentlySold } from "@/lib/market-data";
import { listBuildsByUser } from "@/lib/builds-data";
import { timeAgo, responseTimeLabel } from "@/lib/format";
import { ProductCard } from "@/components/ProductCard";
import { RecentlySold } from "@/components/RecentlySold";
import { connection } from "next/server";


export default async function SellerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Rendered per request, from data that's cached and invalidated by tag
  // (see lib/data.ts). Timed ISR here meant the first visitor after any
  // change got the previous copy — the "only a hard refresh shows it" bug.
  await connection();
  const { id } = await params;

  // One round of queries, not two: only the repeat-buyer lookup needs the
  // reviews (for the reviewer ids), so it chains off that one promise
  // instead of holding everything else back until the first batch is done.
  const reviewsPromise = getSellerReviews(id);
  const [
    { items: listings }, reviews, stats, profile, plan,
    responseMinutes, repeatBuyerIds, recentlySold, builds,
  ] = await Promise.all([
    queryListings({ sellerId: id, perPage: 48 }),
    reviewsPromise,
    getOneSellerStats(id),
    getProfile(id),
    getPremiumPlan(),
    getSellerResponseMinutes(id),
    reviewsPromise.then((r) => getRepeatBuyerIds(id, r.map((x) => x.reviewerId))),
    getRecentlySold({ sellerId: id }),
    listBuildsByUser(id),
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
    <div className="mx-auto max-w-[1560px] px-4 lg:px-6 py-10">
      {profile?.bannerUrl && (
        <div className="relative -mt-2 mb-6 h-32 w-full overflow-hidden rounded-card bg-trust-soft sm:h-44">
          <Image src={profile.bannerUrl} alt="" fill sizes="(max-width: 1240px) 100vw, 1240px" className="object-cover" />
        </div>
      )}
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-trust">
          {profile?.avatarUrl ? (
            <Image src={profile.avatarUrl} alt="" fill sizes="56px" className="object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-xl font-semibold text-white">
              {sellerName[0]}
            </span>
          )}
        </div>
        <div>
          <h1 className="display flex flex-wrap items-center gap-2 text-3xl">
            {sellerName}
            {profile?.username && (
              <span className="spec font-normal text-muted">@{profile.username}</span>
            )}
            {profile?.verified && (
              <span className="spec rounded-lg bg-trust-soft px-1.5 py-0.5 font-semibold text-trust">
                Verified
              </span>
            )}
            {/* Deliberately styled and worded differently from Verified —
                this is a paid badge, not an identity check, and the two
                must never look interchangeable. See lib/premium.ts. */}
            {premium && (
              <span className="spec rounded-lg bg-deal-soft px-1.5 py-0.5 font-semibold text-deal">
                {plan.badgeLabel}
              </span>
            )}
            {profile?.sellerType === "business" && (
              <span className="spec rounded-lg border border-line px-1.5 py-0.5 font-medium text-muted">
                Business seller
              </span>
            )}
          </h1>
          <p className="spec mt-1 text-muted">
            {stats.reviewCount > 0
              ? `★ ${stats.avgRating.toFixed(1)} (${stats.reviewCount} review${stats.reviewCount === 1 ? "" : "s"})`
              : "No reviews yet"}{" "}
            · {stats.salesCount} sale{stats.salesCount === 1 ? "" : "s"}
            {location && ` · ${location}`}
            {profile?.createdAt && ` · Member since ${new Date(profile.createdAt).getFullYear()}`}
          </p>
          {responseMinutes != null && (
            <p className="spec mt-1 text-trust">Usually responds within {responseTimeLabel(responseMinutes)}</p>
          )}
          {profile?.bio && <p className="mt-2 max-w-lg text-sm text-muted">{profile.bio}</p>}
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
        <div className="mt-6 rounded-card border border-line bg-card p-4">
          <p className="eyebrow">Shipping &amp; returns</p>
          <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted">{profile.policyNote}</p>
        </div>
      )}

      <h2 className="display mt-10 text-xl">Active listings</h2>
      {listings.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Nothing listed right now.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => (
            <ProductCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      <h2 className="display mt-10 text-xl">Reviews</h2>
      {reviews.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No reviews yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-card border border-line bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  {r.reviewerName}
                  {repeatBuyerIds.has(r.reviewerId) && (
                    <span className="spec rounded-lg bg-trust-soft px-1.5 py-0.5 font-semibold text-trust">
                      Repeat buyer
                    </span>
                  )}
                </p>
                <p className="spec text-muted">{timeAgo(r.createdAt)}</p>
              </div>
              <p className="spec mt-1 font-medium text-good">
                {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)}
              </p>
              {r.body && <p className="mt-2 text-sm leading-relaxed">{r.body}</p>}
            </li>
          ))}
        </ul>
      )}

      <RecentlySold items={recentlySold} title="Recently sold by this seller" />

      {builds.length > 0 && (
        <div className="mt-6 rounded-card border border-line bg-card p-4">
          <p className="text-sm font-semibold">Build showcase</p>
          <p className="spec mt-1 text-muted">
            {sellerName} has posted {builds.length} build{builds.length === 1 ? "" : "s"}.
          </p>
          <Link href={`/builds/${builds[0].id}`} className="spec mt-2 inline-block font-semibold text-trust hover:underline">
            View {builds.length === 1 ? "it" : "their builds"} →
          </Link>
        </div>
      )}

      <Link href="/shop" className="mt-8 inline-block text-sm font-semibold text-trust hover:underline">
        ← Back to marketplace
      </Link>
    </div>
  );
}

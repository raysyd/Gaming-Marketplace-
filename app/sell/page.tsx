import { getSellerProfile, querySellerListings, getOwnListing } from "@/lib/seller-data";
import { getConnectAccountStatus } from "@/lib/stripe";
import { getPremiumPlan, isPremiumActive } from "@/lib/premium";
import { SellForm } from "@/components/SellForm";

/**
 * Payout-readiness is checked here, server-side, rather than gating in the
 * client form — a seller who isn't signed in or hasn't finished Stripe
 * Connect onboarding sees the "finish payout setup" prompt before they've
 * spent time filling out the whole listing. The real enforcement is the
 * same check repeated in POST /api/listings, since a client-side gate alone
 * is just UX, not a guarantee.
 *
 * Demo mode (no STRIPE_SECRET_KEY at all) skips the gate entirely so the
 * "runs with no configuration" experience keeps working — there's nothing
 * to connect yet.
 */
export default async function SellPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const { draft: draftId } = await searchParams;
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  const [profile, plan, listings, draft] = await Promise.all([
    stripeConfigured ? getSellerProfile() : null,
    getPremiumPlan(),
    querySellerListings(),
    draftId ? getOwnListing(draftId) : null,
  ]);
  const payoutStatus = profile?.stripeAccountId
    ? await getConnectAccountStatus(profile.stripeAccountId)
    : "none";
  const premium = isPremiumActive(profile?.premiumStatus);
  const listingLimit = premium ? plan.premiumListingLimit : plan.freeListingLimit;
  const activeCount = listings.filter((l) => l.status === "active").length;
  // Silently ignored if it's not actually a draft (already published, or
  // doesn't exist/belong to someone else — getOwnListing already scopes
  // to the signed-in seller) — the form just opens blank instead of
  // erroring on a stale or tampered-with link.
  const resumableDraft = draft?.status === "draft" ? draft : null;

  return (
    <SellForm
      payoutsReady={!stripeConfigured || payoutStatus === "active"}
      payoutStatus={payoutStatus}
      maxPhotos={premium ? plan.premiumMaxPhotos : plan.freeMaxPhotos}
      listingLimit={listingLimit}
      activeListingCount={activeCount}
      premium={premium}
      initialDraft={resumableDraft ?? undefined}
    />
  );
}

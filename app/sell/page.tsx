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
  searchParams: Promise<{ draft?: string; edit?: string }>;
}) {
  const { draft: draftId, edit: editId } = await searchParams;
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  const [profile, plan, listings, draft] = await Promise.all([
    stripeConfigured ? getSellerProfile() : null,
    getPremiumPlan(),
    querySellerListings(),
    draftId ? getOwnListing(draftId) : null,
  ]);
  // Editing a live listing — getOwnListing is already scoped to this
  // seller, so someone else's id just falls through to a blank form.
  const editable = editId ? await getOwnListing(editId) : null;
  const editing = editable?.status === "active" ? editable : null;
  const payoutStatus = profile?.stripeAccountId
    ? await getConnectAccountStatus(profile.stripeAccountId)
    : "none";
  const premium = isPremiumActive(profile?.premiumStatus);
  const listingLimit = premium ? plan.premiumListingLimit : plan.freeListingLimit;
  const activeCount = listings.filter((l) => l.status === "active").length;
  // Silently ignored if it's not actually a draft (already published, or
  // doesn't exist/belong to someone else — getOwnListing already scopes
  // to the signed-in seller) — the form just opens blank instead of
  // erroring on a stale or tampered-with link. staleDraftParam tells the
  // client (which may have supplied this id itself, from localStorage —
  // see SellForm's auto-resume effect) to stop remembering it.
  const resumableDraft = draft?.status === "draft" ? draft : null;
  const staleDraftParam = Boolean(draftId) && !resumableDraft;

  return (
    <SellForm
      payoutsReady={!stripeConfigured || payoutStatus === "active"}
      payoutStatus={payoutStatus}
      maxPhotos={premium ? plan.premiumMaxPhotos : plan.freeMaxPhotos}
      listingLimit={listingLimit}
      activeListingCount={activeCount}
      premium={premium}
      initialDraft={editing ? undefined : resumableDraft ?? undefined}
      staleDraftParam={staleDraftParam}
      editing={editing ?? undefined}
    />
  );
}

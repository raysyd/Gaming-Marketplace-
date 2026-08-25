import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/supabase/server";
import { getPremiumPlan, isPremiumActive } from "@/lib/premium";
import { AccountSettingsForm } from "@/components/AccountSettingsForm";
import { PremiumCard } from "@/components/PremiumCard";

export default async function AccountPage() {
  const { supabase, user } = await getAuthedUser();
  if (!supabase || !user) redirect("/login?next=/account");

  const [{ data: profile, error: profileError }, plan, { count: activeCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "display_name, username, avatar_url, banner_url, bio, suburb, state, contact_link, policy_note, verified, premium_status, seller_type"
      )
      .eq("id", user.id)
      .maybeSingle(),
    getPremiumPlan(),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", user.id)
      .eq("status", "active"),
  ]);

  // A real query error (bad column, RLS/grant mismatch, transient network
  // failure) used to look identical to "no profile yet" below and silently
  // bounced an existing user into onboarding instead of their own settings.
  // Surface it instead — app/error.tsx turns this into a visible, logged,
  // recoverable card rather than a page that quietly redirects or renders
  // nothing.
  if (profileError) {
    console.error("Failed to load profile for /account", profileError);
    throw new Error(`Couldn't load your profile: ${profileError.message}`);
  }

  const premium = isPremiumActive(profile?.premium_status);

  // The onboarding step is what actually sets username — a signed-in
  // account that skipped it (or predates this feature) lands here without
  // one; send it to finish that first rather than showing a settings page
  // for a profile that doesn't fully exist yet.
  if (!profile?.username) redirect("/account/onboarding?next=/account");

  return (
    <main className="mx-auto max-w-[640px] px-4 py-12">
      <p className="eyebrow">Account</p>
      <h1 className="display mt-2 text-[28px]">Settings</h1>
      <p className="mt-2 text-[14px] text-muted">
        @{profile.username} · {user.email}
      </p>

      <AccountSettingsForm
        displayName={profile.display_name ?? ""}
        avatarUrl={profile.avatar_url ?? ""}
        bannerUrl={profile.banner_url ?? ""}
        bio={profile.bio ?? ""}
        suburb={profile.suburb ?? ""}
        state={profile.state ?? ""}
        contactLink={profile.contact_link ?? ""}
        policyNote={profile.policy_note ?? ""}
        sellerType={profile.seller_type === "business" ? "business" : "private"}
        verified={Boolean(profile.verified)}
        email={user.email ?? ""}
      />

      <PremiumCard
        active={premium}
        badgeLabel={plan.badgeLabel}
        monthlyPriceCents={plan.monthlyPriceCents}
        listingLimit={premium ? plan.premiumListingLimit : plan.freeListingLimit}
        maxPhotos={premium ? plan.premiumMaxPhotos : plan.freeMaxPhotos}
        activeListingCount={activeCount ?? 0}
      />

      {/* Grandfathered, not force-deactivated: dropping below Premium never
          takes existing listings down on its own (see
          app/api/listings/route.ts, which only blocks *new* ones past the
          limit) — this just makes that policy visible instead of a silent
          surprise the next time they try to list something. */}
      {!premium && (activeCount ?? 0) > plan.freeListingLimit && (
        <div className="mt-4 rounded-[10px] border border-deal/40 bg-deal-soft px-4 py-3.5 text-[13.5px] leading-relaxed text-ink">
          <strong>
            You have {activeCount} active listings, over the free plan&apos;s {plan.freeListingLimit}-listing limit.
          </strong>{" "}
          They&apos;ll stay live — you just can&apos;t add another until you&apos;re back under the limit
          (take one down) or you resubscribe to {plan.badgeLabel}.
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/selling#payouts"
          className="rounded-[10px] border border-line bg-card p-4 transition hover:border-ink/30"
        >
          <p className="text-[14px] font-semibold">Payout settings</p>
          <p className="spec mt-1 text-muted">
            Connect or manage your Stripe payout account. {" "}
            Sidegrade never collects or stores your bank details or ABN itself.
          </p>
        </Link>
        <Link
          href="/account/security"
          className="rounded-[10px] border border-line bg-card p-4 transition hover:border-ink/30"
        >
          <p className="text-[14px] font-semibold">Security</p>
          <p className="spec mt-1 text-muted">Two-factor authentication.</p>
        </Link>
        <Link
          href="/account/searches"
          className="rounded-[10px] border border-line bg-card p-4 transition hover:border-ink/30"
        >
          <p className="text-[14px] font-semibold">Saved searches</p>
          <p className="spec mt-1 text-muted">Get emailed when a new listing matches.</p>
        </Link>
      </div>

      <Link
        href="/account/delete"
        className="spec mt-6 block text-deal hover:underline"
      >
        Delete account
      </Link>
    </main>
  );
}

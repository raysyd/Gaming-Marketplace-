import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/supabase/server";
import { getPremiumPlan, isPremiumActive } from "@/lib/premium";
import { AccountSettingsForm } from "@/components/AccountSettingsForm";
import { PremiumCard } from "@/components/PremiumCard";

export default async function AccountPage() {
  const { supabase, user } = await getAuthedUser();
  if (!supabase || !user) redirect("/login?next=/account");

  const [{ data: profile, error: profileError }, plan] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, username, avatar_url, bio, suburb, state, verified, premium_status")
      .eq("id", user.id)
      .maybeSingle(),
    getPremiumPlan(),
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
        bio={profile.bio ?? ""}
        suburb={profile.suburb ?? ""}
        state={profile.state ?? ""}
        verified={Boolean(profile.verified)}
        email={user.email ?? ""}
      />

      <PremiumCard
        active={premium}
        badgeLabel={plan.badgeLabel}
        monthlyPriceCents={plan.monthlyPriceCents}
        listingLimit={premium ? plan.premiumListingLimit : plan.freeListingLimit}
        maxPhotos={premium ? plan.premiumMaxPhotos : plan.freeMaxPhotos}
      />

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

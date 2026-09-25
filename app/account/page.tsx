import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/supabase/server";
import { getPremiumPlan, isPremiumActive } from "@/lib/premium";
import { AccountSettingsForm } from "@/components/AccountSettingsForm";
import { PremiumCard } from "@/components/PremiumCard";
import { Icon } from "@/components/ui/Icon";

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
    <main className="mx-auto max-w-[1180px] px-4 py-10 lg:px-8 lg:py-14">
      <div className="flex items-center gap-5">
        <span className="grid h-16 w-16 shrink-0 -rotate-3 place-items-center overflow-hidden rounded-[18px] bg-chrome-2 font-[family-name:var(--font-display)] text-[28px] font-bold text-[#f3efe6] shadow-[var(--shadow-md)]">
          {(profile.display_name || profile.username || "?")[0].toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="eyebrow">Account</p>
          <h1 className="display mt-1 text-[clamp(32px,4vw,44px)]">Settings</h1>
          <p className="mt-1 truncate text-[14px] text-muted">
            @{profile.username} · {user.email}
          </p>
        </div>
      </div>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">

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
        <div className="alert alert-warn">
          <strong>
            You have {activeCount} active listings, over the free plan&apos;s {plan.freeListingLimit}-listing limit.
          </strong>{" "}
          They&apos;ll stay live — you just can&apos;t add another until you&apos;re back under the limit
          (take one down) or you resubscribe to {plan.badgeLabel}.
        </div>
      )}

      </div>

      <nav aria-label="Account sections" className="grid gap-3 lg:sticky lg:top-[calc(var(--header-offset,140px)+16px)]">
        {(
          [
            ["/selling#payouts", "wallet", "Payout settings", `Connect or manage your Stripe payout account. ${"Sidegrade"} never collects or stores your bank details or ABN itself.`],
            ["/account/security", "key", "Security", "Two-factor authentication."],
            ["/account/searches", "bell", "Saved searches", "Get emailed when a new listing matches."],
          ] as const
        ).map(([href, icon, title, body]) => (
          <Link key={href} href={href} className="card-lift group panel flex items-start gap-3.5 p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-trust-soft text-trust transition group-hover:bg-signal group-hover:text-signal-ink">
              <Icon name={icon} size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between text-[15px] font-semibold">
                {title}
                <Icon name="chevron-right" size={16} className="text-muted transition group-hover:translate-x-0.5" />
              </span>
              <span className="mt-1 block text-[13px] leading-relaxed text-muted">{body}</span>
            </span>
          </Link>
        ))}
        <Link
          href="/account/delete"
          className="flex items-center gap-2 rounded-[12px] border border-dashed border-line-strong p-4 text-[13.5px] font-semibold text-danger transition hover:border-danger hover:bg-danger-soft"
        >
          <Icon name="trash" size={16} />
          Delete account
        </Link>
      </nav>
      </div>
    </main>
  );
}

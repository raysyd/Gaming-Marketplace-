"use client";
import { useState } from "react";
import { Icon } from "./ui/Icon";
import { money } from "@/lib/format";
import { ListingUsageBar } from "./ListingUsageBar";

export function PremiumCard({
  active,
  badgeLabel,
  monthlyPriceCents,
  listingLimit,
  maxPhotos,
  activeListingCount,
}: {
  active: boolean;
  badgeLabel: string;
  monthlyPriceCents: number;
  listingLimit: number;
  maxPhotos: number;
  activeListingCount: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const go = async (path: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(path, { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? data.message ?? "Couldn't continue. Try again.");
    } catch {
      setError("Couldn't reach the server.");
    }
    setBusy(false);
  };

  return (
    <section className="panel relative overflow-hidden p-6 sm:p-8">
      <span className="perfboard pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-60 [mask-image:linear-gradient(90deg,transparent,#000)]" aria-hidden="true" />
      <div className="relative flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-gold-soft text-gold">
            <Icon name="sparkle" size={18} />
          </span>
          <span className="display text-[24px]">{badgeLabel}</span>
        </h2>
        {active && <span className="badge badge-gold">Active</span>}
      </div>
      <p className="relative mt-3 max-w-md text-[14px] leading-relaxed text-muted">
        {active
          ? `You have up to ${listingLimit} active listings and ${maxPhotos} photos per listing, plus the ${badgeLabel} badge on your profile.`
          : `Up to ${listingLimit} active listings, ${maxPhotos} photos per listing, and the ${badgeLabel} badge — ${money(
              monthlyPriceCents / 100
            )}/month.`}
      </p>
      <p className="relative mt-1 text-[12.5px] text-muted">
        A paid badge, not an identity check — separate from Verified.
      </p>
      <ListingUsageBar count={activeListingCount} limit={listingLimit} />
      {error && <p className="text-[13px] font-medium text-danger mt-2">{error}</p>}
      <button
        onClick={() => go(active ? "/api/premium/portal" : "/api/premium/checkout")}
        disabled={busy}
        className={`btn relative mt-5 ${active ? "btn-outline" : "btn-dark"}`}
      >
        {busy ? "Loading…" : active ? "Manage subscription" : `Upgrade to ${badgeLabel}`}
      </button>
    </section>
  );
}

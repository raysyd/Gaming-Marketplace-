"use client";
import { useState } from "react";
import { money } from "@/lib/format";

export function PremiumCard({
  active,
  badgeLabel,
  monthlyPriceCents,
  listingLimit,
  maxPhotos,
}: {
  active: boolean;
  badgeLabel: string;
  monthlyPriceCents: number;
  listingLimit: number;
  maxPhotos: number;
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
    <div className="mt-6 rounded-[10px] border border-line bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="eyebrow">{badgeLabel}</h2>
        {active && (
          <span className="spec rounded bg-deal-soft px-1.5 py-0.5 font-semibold text-deal">Active</span>
        )}
      </div>
      <p className="mt-2 max-w-md text-[13.5px] text-muted">
        {active
          ? `You have up to ${listingLimit} active listings and ${maxPhotos} photos per listing, plus the ${badgeLabel} badge on your profile.`
          : `Up to ${listingLimit} active listings, ${maxPhotos} photos per listing, and the ${badgeLabel} badge — ${money(
              monthlyPriceCents / 100
            )}/month.`}
      </p>
      <p className="spec mt-1 text-muted">
        A paid badge, not an identity check — separate from Verified.
      </p>
      {error && <p className="spec mt-2 text-deal">{error}</p>}
      <button
        onClick={() => go(active ? "/api/premium/portal" : "/api/premium/checkout")}
        disabled={busy}
        className="mt-3 rounded-md bg-ink px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Loading…" : active ? "Manage subscription" : `Upgrade to ${badgeLabel}`}
      </button>
    </div>
  );
}

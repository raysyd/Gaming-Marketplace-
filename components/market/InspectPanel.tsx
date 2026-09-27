import Link from "next/link";
import { money } from "@/lib/format";
import type { ModelStats } from "@/lib/market-index";
import type { Listing, MarketTag } from "@/lib/types";
import { TIERS, tierFor } from "@/lib/deal-tier";
import { PriceRail, TierMark } from "./Tier";
import { MarketStrip } from "./MarketStrip";

/**
 * The listing page's "inspect" panel, read like an item card in a game:
 * the tier, then this price compared stat-by-stat against the market
 * (green arrow = better for you), the price rail, every comparable on the
 * market strip, and what proof the seller has given.
 */
export function InspectPanel({ listing, tag, stats }: { listing: Listing; tag: MarketTag; stats: ModelStats }) {
  const tier = tierFor(tag.delta);
  const pct = Math.round(Math.abs(tag.delta) * 100);
  const rows: { label: string; value: string; diff: number | null }[] = [
    { label: "Going rate", value: money(stats.rate), diff: listing.price - stats.rate },
    { label: "Cheapest for sale", value: stats.lowestAsk != null ? money(stats.lowestAsk) : "—", diff: stats.lowestAsk != null ? listing.price - stats.lowestAsk : null },
    { label: "Range seen", value: `${money(stats.low)}–${money(stats.high)}`, diff: null },
  ];
  const realPhotos = [listing.image, ...(listing.images ?? [])].filter((p) => p && !p.startsWith("/products/")).length;
  const proof: { ok: boolean; text: string }[] = [
    { ok: (listing.benchmarkImages ?? []).length > 0, text: "Benchmark screenshot (GPU-Z, CPU-Z or 3DMark)" },
    { ok: listing.sellerVerified, text: "Seller's identity verified" },
    { ok: realPhotos >= 3, text: "Three or more real photos" },
    { ok: true, text: "Payment held until you confirm it arrived" },
  ];

  return (
    <section className={`inspect tier-${tier}`} aria-label="Price against the market">
      <header className="flex items-center gap-4">
        <TierMark tier={tier} large />
        <div className="min-w-0">
          <p className="text-[17px] font-semibold tracking-tight">{TIERS[tier].label}</p>
          <p className="text-sm text-muted">
            {Math.abs(tag.delta) < 0.03 ? "At" : `${pct}% ${tag.delta < 0 ? "under" : "over"}`} the going rate for a used {stats.name}
          </p>
        </div>
      </header>

      {tier === "check" && (
        <div className="inspect-warn" role="note">
          <b>This is far cheaper than any {stats.name} usually goes for.</b> Gutted cards and photos of cards get listed at
          prices like this. Ask the seller for a GPU-Z screenshot from their own machine and never pay outside Sidegrade.{" "}
          <Link href="/trust" className="underline">
            How we protect you
          </Link>
        </div>
      )}

      <div className="mt-6">
        <PriceRail delta={tag.delta} large />
        <div className="mono mt-2 flex justify-between text-[10.5px] uppercase tracking-wider text-muted">
          <span>Check it</span>
          <span>Steal</span>
          <span>Fair</span>
          <span>Above</span>
        </div>
      </div>

      <dl className="inspect-stats">
        {rows.map((r) => (
          <div key={r.label}>
            <dt>{r.label}</dt>
            <dd>
              <span className="price">{r.value}</span>
              {r.diff != null && Math.abs(r.diff) >= 1 && (
                <span className={`inspect-diff ${r.diff < 0 ? "is-better" : "is-worse"}`}>
                  {r.diff < 0 ? "▼" : "▲"} {money(Math.abs(r.diff))}
                </span>
              )}
              {r.diff != null && Math.abs(r.diff) < 1 && <span className="inspect-diff">= same</span>}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6">
        <p className="eyebrow mb-2">Every {stats.name} on Sidegrade</p>
        <MarketStrip stats={stats} price={listing.price} />
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <p className="eyebrow mb-3">Proof</p>
        <ul className="grid gap-2 text-sm">
          {proof.map((p) => (
            <li key={p.text} className={`flex items-center gap-2.5 ${p.ok ? "" : "text-muted"}`}>
              <span className={`inspect-check ${p.ok ? "is-ok" : ""}`} aria-hidden="true">
                {p.ok ? "✓" : "–"}
              </span>
              {p.text}
              <span className="sr-only">{p.ok ? "(yes)" : "(not provided)"}</span>
            </li>
          ))}
        </ul>
      </div>

      <Link href={`/shop?q=${encodeURIComponent(stats.name)}&sort=low`} className="sec-link mt-5 inline-block">
        Compare all {stats.forSale} for sale →
      </Link>
    </section>
  );
}

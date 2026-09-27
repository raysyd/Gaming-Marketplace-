import Link from "next/link";
import { money } from "@/lib/format";
import type { ModelStats } from "@/lib/market-index";
import type { MarketTag } from "@/lib/types";
import { MarketChip } from "@/components/MarketChip";
import { Sparkline } from "./Sparkline";

/**
 * On a listing page: this price against the going rate for the model, with
 * where it sits between the cheapest and dearest comparable, the trend, and
 * a way to see every other one for sale.
 */
export function MarketPanel({ price, tag, stats }: { price: number; tag: MarketTag; stats: ModelStats }) {
  const span = Math.max(1, stats.high - stats.low);
  const at = (v: number) => `${Math.min(100, Math.max(0, ((v - stats.low) / span) * 100))}%`;
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-card p-5" aria-label="Price against the going rate">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Going rate · used {stats.name}</p>
          <p className="price mt-2 text-[30px] leading-none">{money(stats.rate)}</p>
        </div>
        <div className="text-right">
          <MarketChip tag={tag} long />
          <p className={`mono mt-2 text-xs ${stats.change == null ? "text-muted" : stats.change < 0 ? "chg-down" : "chg-up"}`}>
            {stats.change == null ? "Not enough data for a 30-day change" : `${stats.change < 0 ? "▼" : "▲"} ${Math.abs(stats.change * 100).toFixed(1)}% in 30 days`}
          </p>
        </div>
      </div>

      {/* Range of comparable prices, with the going rate and this listing marked */}
      <div className="relative mt-7 h-2 rounded-full bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)]" aria-hidden="true">
        <span className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-muted" style={{ left: at(stats.rate) }} />
        <span
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-ink shadow"
          style={{ left: at(price) }}
        />
      </div>
      <div className="mono mt-2 flex justify-between text-[11px] text-muted">
        <span>{money(stats.low)}</span>
        <span>This one {money(price)}</span>
        <span>{money(stats.high)}</span>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-line pt-4">
        <div className="w-28">
          <Sparkline points={stats.spark} />
        </div>
        <Link href={`/shop?q=${encodeURIComponent(stats.name)}&sort=low`} className="sec-link text-right">
          See all {stats.forSale} for sale <span aria-hidden="true">→</span>
        </Link>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Median of {stats.comps} {stats.name} listings and sales on Sidegrade. A guide, not a valuation.
      </p>
    </section>
  );
}

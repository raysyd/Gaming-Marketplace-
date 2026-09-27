import type { MarketTag } from "@/lib/types";
import { money } from "@/lib/format";

/**
 * "8% under going rate" / "At going rate" / "5% over". Within ±3% counts
 * as at the going rate, so a few dollars either way doesn't read as a deal.
 */
export function MarketChip({ tag, long = false }: { tag: MarketTag; long?: boolean }) {
  const pct = Math.round(Math.abs(tag.delta) * 100);
  const kind = tag.delta <= -0.03 ? "under" : tag.delta >= 0.03 ? "over" : "at";
  const text =
    kind === "at" ? "At going rate" : `${pct}% ${kind === "under" ? "under" : "over"}${long ? " going rate" : ""}`;
  const title = `Going rate for a used ${tag.model}: ${money(tag.rate)}, from ${tag.comps} listings and sales on Sidegrade`;
  return (
    <span className={`mkt mkt-${kind}`} title={title}>
      {kind === "under" ? "▼" : kind === "over" ? "▲" : "●"} {text}
    </span>
  );
}

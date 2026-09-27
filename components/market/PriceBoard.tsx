import Link from "next/link";
import { money } from "@/lib/format";
import type { ModelStats } from "@/lib/market-index";
import { Sparkline } from "./Sparkline";

/**
 * The market board: going rate, 30-day change, trend, lowest price for sale
 * and how many are listed, for each GPU/CPU model with enough comparables.
 * Each row opens the shop filtered to that model.
 */
export function PriceBoard({ models, caption }: { models: ModelStats[]; caption?: string }) {
  if (!models.length) return null;
  return (
    <div className="board" role="table" aria-label={caption ?? "Going rates for used parts"}>
      <div className="board-head" role="row">
        <span role="columnheader">Model</span>
        <span role="columnheader" className="board-right">Going rate</span>
        <span role="columnheader" className="board-right">30 days</span>
        <span role="columnheader" className="board-hide-sm">Trend</span>
        <span role="columnheader" className="board-right board-hide-sm">Lowest ask</span>
        <span role="columnheader" className="board-right board-hide-sm">For sale</span>
      </div>
      {models.map((m) => (
        <Link key={m.key} href={`/shop?q=${encodeURIComponent(m.name)}&sort=low`} className="board-row" role="row">
          <span className="board-model" role="cell">
            <span className="board-kind">{m.kind.toUpperCase()}</span>
            <span className="truncate">{m.name}</span>
          </span>
          <span className="board-num board-right font-semibold" role="cell">{money(m.rate)}</span>
          <span className={`board-num board-right ${m.change == null ? "text-muted" : m.change < 0 ? "chg-down" : "chg-up"}`} role="cell">
            {m.change == null ? "—" : `${m.change < 0 ? "▼" : "▲"} ${Math.abs(m.change * 100).toFixed(1)}%`}
          </span>
          <span className="board-hide-sm" role="cell">
            <Sparkline points={m.spark} />
          </span>
          <span className="board-num board-right board-hide-sm" role="cell">{m.lowestAsk != null ? money(m.lowestAsk) : "—"}</span>
          <span className="board-num board-right board-hide-sm text-muted" role="cell">{m.forSale}</span>
        </Link>
      ))}
    </div>
  );
}

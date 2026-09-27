"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import type { ModelStats } from "@/lib/market-index";
import { tierFor } from "@/lib/deal-tier";
import { Sparkline } from "./Sparkline";
import { MarketStrip } from "./MarketStrip";
import { TierMark } from "./Tier";

export type BoardListing = { id: string; slug: string; title: string; price: number; location: string };
type SortKey = "rank" | "rate" | "change" | "forSale";

/**
 * The going-rate leaderboard. Ranked by how much each model trades; sort by
 * any column; filter to GPUs or CPUs. Selecting a row opens it in place: every
 * comparable price on the market strip and the three cheapest you can buy,
 * each with its deal tier.
 */
export function Board({ models, cheapest }: { models: ModelStats[]; cheapest: Record<string, BoardListing[]> }) {
  const [kind, setKind] = useState<"all" | "gpu" | "cpu">("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "rank", dir: 1 });
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const ranked = models.map((m, i) => ({ ...m, rank: i + 1 }));
    const shown = ranked.filter((m) => kind === "all" || m.kind === kind);
    const val = (m: (typeof ranked)[number]) => {
      if (sort.key === "change") return m.change ?? (sort.dir === 1 ? Infinity : -Infinity);
      if (sort.key === "rank") return m.rank;
      return m[sort.key];
    };
    return [...shown].sort((a, b) => (val(a) - val(b)) * sort.dir);
  }, [models, kind, sort]);

  const head = (key: SortKey, label: string, cls = "") => (
    <button
      type="button"
      onClick={() =>
        setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "rank" ? 1 : -1 }))
      }
      className={`board-sort ${cls} ${sort.key === key ? "is-on" : ""}`}
      aria-label={`Sort by ${label === "#" ? "rank" : label}`}
    >
      {label}
      <span aria-hidden="true">{sort.key === key && key !== "rank" ? (sort.dir === 1 ? "↑" : "↓") : ""}</span>
    </button>
  );

  const tabs: ["all" | "gpu" | "cpu", string][] = [
    ["all", "All"],
    ["gpu", "Graphics cards"],
    ["cpu", "Processors"],
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Part type">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={`pill ${kind === k ? "is-on" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="board">
        <div className="board-head">
          {head("rank", "#")}
          <span>Model</span>
          {head("rate", "Going rate", "board-right")}
          {head("change", "30 days", "board-right")}
          <span className="board-hide-sm">Trend</span>
          <span className="board-right board-hide-sm">Lowest ask</span>
          {head("forSale", "For sale", "board-right board-hide-sm")}
        </div>

        {rows.map((m, n) => {
          const isOpen = open === m.key;
          const deals = cheapest[m.key] ?? [];
          return (
            <div key={m.key} className={`board-item ${isOpen ? "is-open" : ""}`} style={{ animationDelay: `${n * 45}ms` }}>
              <button type="button" className="board-row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : m.key)}>
                <span className={`board-rank ${m.rank <= 3 ? `is-top is-${m.rank}` : ""}`}>{m.rank}</span>
                <span className="board-model">
                  <span className="board-kind">{m.kind.toUpperCase()}</span>
                  <span className="truncate">{m.name}</span>
                </span>
                <span className="board-num board-right font-semibold">{money(m.rate)}</span>
                <span
                  className={`board-num board-right ${m.change == null ? "text-muted" : m.change < 0 ? "chg-down" : "chg-up"}`}
                >
                  {m.change == null ? "—" : `${m.change < 0 ? "▼" : "▲"} ${Math.abs(m.change * 100).toFixed(1)}%`}
                </span>
                <span className="board-hide-sm draw is-in">
                  <Sparkline points={m.spark} />
                </span>
                <span className="board-num board-right board-hide-sm">{m.lowestAsk != null ? money(m.lowestAsk) : "—"}</span>
                <span className="board-num board-right board-hide-sm text-muted">
                  {m.forSale}
                  <span className="board-chev" aria-hidden="true">
                    ›
                  </span>
                </span>
              </button>

              {isOpen && (
                <div className="board-drawer">
                  <div className="grid gap-6 px-5 pb-6 pt-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                    <div>
                      <p className="eyebrow mb-3">Every {m.name} on Sidegrade · filled = for sale, hollow = sold</p>
                      <MarketStrip stats={m} />
                    </div>
                    <div>
                      <p className="eyebrow mb-3">Cheapest right now</p>
                      {deals.length ? (
                        <ul className="grid gap-2">
                          {deals.map((d) => (
                            <li key={d.id}>
                              <Link href={`/product/${d.id}/${d.slug}`} className="board-deal">
                                <TierMark tier={tierFor(d.price / m.rate - 1)} />
                                <span className="min-w-0 flex-1 truncate">{d.title}</span>
                                <span className="price">{money(d.price)}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted">None for sale right now.</p>
                      )}
                      <Link href={`/shop?q=${encodeURIComponent(m.name)}&sort=low`} className="sec-link mt-4 inline-block">
                        See all {m.forSale} for sale →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

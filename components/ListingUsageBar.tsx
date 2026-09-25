/**
 * "N of M listings used" — shown on both /account (PremiumCard) and /sell
 * (SellForm), which is exactly why it's its own component instead of
 * duplicated markup: the limit itself was already only ever visible as a
 * number in prose, or as a blocking message once a seller was already at
 * it — nothing showed how close they were before that.
 */
export function ListingUsageBar({ count, limit }: { count: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((count / limit) * 100)) : 0;
  const atLimit = count >= limit;
  return (
    <div className="relative mt-4 max-w-md">
      <div className="flex items-baseline justify-between text-[12.5px]">
        <span className="text-muted">Listings used</span>
        <span className={`font-semibold tabular-nums ${atLimit ? "text-deal" : "text-ink"}`}>
          {count} / {limit}
        </span>
      </div>
      <div className="perf-bar mt-1.5">
        <span className={`perf-fill ${atLimit ? "perf-value" : "perf-score"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

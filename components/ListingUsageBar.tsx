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
    <div className="mt-3">
      <div className="flex items-baseline justify-between">
        <span className="spec text-muted">
          {count} of {limit} listings used
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full ${atLimit ? "bg-deal" : "bg-trust"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

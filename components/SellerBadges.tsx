type Props = {
  verified?: boolean;
  salesCount: number;
  avgRating: number;
  reviewCount: number;
  /** Median reply time in minutes, when known (seller page only). */
  responseMinutes?: number | null;
};

// Thresholds for the earned badges. Each one is a plain fact about the
// seller's record, never a ranking we can't back up.
const POWER_SELLER_SALES = 25;
const TOP_RATED_MIN_REVIEWS = 5;
const TOP_RATED_MIN_AVG = 4.8;
const FAST_REPLY_MINUTES = 60;

/** Trust badges shown next to a seller's name. */
export function SellerBadges({ verified, salesCount, avgRating, reviewCount, responseMinutes }: Props) {
  const badges: { key: string; label: string; title: string; tone: string }[] = [];
  if (verified)
    badges.push({ key: "verified", label: "Verified trader", title: "Identity checked with Stripe Identity", tone: "badge-a" });
  if (reviewCount >= TOP_RATED_MIN_REVIEWS && avgRating >= TOP_RATED_MIN_AVG)
    badges.push({ key: "top", label: "Top rated", title: `${avgRating.toFixed(1)}★ from ${reviewCount} reviews`, tone: "badge-c" });
  if (salesCount >= POWER_SELLER_SALES)
    badges.push({ key: "power", label: `${POWER_SELLER_SALES}+ sales`, title: `${salesCount} completed sales`, tone: "badge-b" });
  if (responseMinutes != null && responseMinutes <= FAST_REPLY_MINUTES)
    badges.push({ key: "fast", label: "Fast replies", title: "Usually replies within an hour", tone: "badge-b" });
  if (!badges.length) return null;
  return (
    <ul className="seller-badges" aria-label="Seller badges">
      {badges.map((b) => (
        <li key={b.key} className={`seller-badge ${b.tone}`} title={b.title}>
          {b.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Neon reputation meters: star rating out of 5 and, when the reviews are
 * to hand, the share of 4★+ reviews. With no reviews it says so instead of
 * drawing an empty bar that reads like a bad score.
 */
export function ReputationMeter({
  avgRating,
  reviewCount,
  positiveShare,
}: {
  avgRating: number;
  reviewCount: number;
  /** 0–1 share of reviews rated 4★ or more, if known. */
  positiveShare?: number;
}) {
  if (reviewCount === 0) {
    return <p className="rep-empty">No reviews yet. Every order is still escrow protected.</p>;
  }
  const meters = [
    { key: "rating", label: "Rating", value: avgRating / 5, text: `${avgRating.toFixed(1)} / 5`, tone: "meter-b" },
    ...(positiveShare != null
      ? [{ key: "positive", label: "Positive reviews", value: positiveShare, text: `${Math.round(positiveShare * 100)}%`, tone: "meter-c" }]
      : []),
  ];
  return (
    <div className="rep-meters">
      {meters.map((m) => (
        <div key={m.key} className="rep-meter">
          <div className="rep-meter-head">
            <span>{m.label}</span>
            <span className="rep-meter-value">{m.text}</span>
          </div>
          <div
            className={`rep-bar ${m.tone}`}
            role="meter"
            aria-label={m.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(m.value * 100)}
            aria-valuetext={m.text}
          >
            <span style={{ width: `${Math.max(2, Math.min(100, m.value * 100))}%` }} />
          </div>
        </div>
      ))}
      <p className="rep-foot">
        From {reviewCount} review{reviewCount === 1 ? "" : "s"} on completed orders
      </p>
    </div>
  );
}

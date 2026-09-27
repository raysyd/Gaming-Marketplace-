import { BRAND } from "@/lib/brand";

const STEPS = [
  {
    title: "Funds secured",
    body: `You pay ${BRAND.name}, not the seller. The money is held until the item reaches you.`,
  },
  {
    title: "Seller ships",
    body: `${BRAND.orderWindowHours} hours to post it with tracking (${BRAND.pickupHandoverDays} days to hand it over at pickup), or you're refunded automatically.`,
  },
  {
    title: "You check it",
    body: "Test it when it arrives. Report a problem before the payout and it freezes while support looks.",
  },
  {
    title: "Seller payout",
    body: `Released when you confirm, or ${BRAND.shippedAutoReleaseDays} days after posting if nothing's reported. ${BRAND.feePercent}% fee.`,
  },
] as const;

/**
 * The escrow path every order takes, as a vertical step tracker. `current`
 * is the step the order is on (0 = paying now); earlier steps show as done.
 * Pure markup, so it renders on the server or inside client panels alike.
 */
export function EscrowTimeline({ current = 0, compact = false }: { current?: number; compact?: boolean }) {
  return (
    <ol className={`escrow-timeline ${compact ? "is-compact" : ""}`} aria-label="How your payment is protected">
      {STEPS.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "next";
        return (
          <li key={step.title} className={`escrow-step is-${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="escrow-node" aria-hidden="true">
              {state === "done" ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              ) : (
                i + 1
              )}
            </span>
            <div className="escrow-copy">
              <p className="escrow-title">
                {step.title}
                {state === "current" && <span className="escrow-now">Next</span>}
              </p>
              {!compact && <p className="escrow-body">{step.body}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Loading-screen tips, the way games use the wait: one genuinely useful
 * line about buying or selling used hardware. Picked from the time so the
 * server and the browser agree on which one to show.
 */
export const TIPS = [
  "Ask for a GPU-Z screenshot taken on the seller's own machine before you pay.",
  "A card listed at half the going rate needs a reason. \"Needs gone today\" isn't one.",
  "Never pay outside Sidegrade. Off-platform payments have no protection.",
  "Your money is held until you confirm the part arrived and works.",
  "DDR4 and DDR5 aren't interchangeable. Check what your board takes.",
  "Match the CPU socket to the motherboard: AM5, AM4 or LGA1700.",
  "Check the card's length against your case before you buy.",
  "A quality 80+ Gold power supply is the part never worth cheaping out on.",
  "Sellers: listing at the going rate sells faster than listing high and waiting.",
];

export function LoadingTip() {
  const tip = TIPS[Math.floor(Date.now() / 60000) % TIPS.length];
  return (
    <p className="load-tip" role="status">
      <span className="load-bar" aria-hidden="true" />
      <span>
        <b className="mono text-ink">TIP</b> {tip}
      </span>
    </p>
  );
}

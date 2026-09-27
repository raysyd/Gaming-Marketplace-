import type { Condition } from "./types";

/**
 * Listing condition shown as a colour-coded tier, the way games colour
 * item rarity. The label is always the real condition; only the colour
 * (a `tier-*` class, see app/globals.css) carries the tier.
 */
export const CONDITION_TIERS: Record<Condition, { tier: string; rank: number }> = {
  New: { tier: "tier-new", rank: 4 },
  "Like new": { tier: "tier-likenew", rank: 3 },
  Used: { tier: "tier-used", rank: 2 },
  "For parts": { tier: "tier-parts", rank: 1 },
};

export const CONDITIONS = Object.keys(CONDITION_TIERS) as Condition[];

export function tierClass(condition: string | undefined): string {
  return CONDITION_TIERS[condition as Condition]?.tier ?? "tier-used";
}

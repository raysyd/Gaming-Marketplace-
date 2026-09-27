/**
 * Australia Post tracking — interface only. Automatic delivery detection
 * needs an AusPost merchant API account, which doesn't exist yet, so
 * `track()` is a stub that always reports "unknown". Nothing here fakes a
 * real API call or claims verification that isn't happening.
 *
 * Until a real client exists, delivery is confirmed by the buyer from
 * /buying (POST /api/orders/[id]/release), or a shipped order auto-releases
 * BRAND.shippedAutoReleaseDays after posting unless the buyer reports a
 * problem. A seller can no longer mark their own order delivered. Swap
 * `stubAusPost` for a real implementation of `AusPostClient` here and
 * lib/orders/tracking.ts (used by the seller's "Check delivery" button and
 * the daily cron) picks it up automatically.
 */

export type TrackingStatus = "in_transit" | "delivered" | "unknown";

export type TrackingEvent = {
  status: TrackingStatus;
  /** When AusPost recorded the event, if it reported one. */
  occurredAt?: string;
};

export interface AusPostClient {
  track(trackingNumber: string): Promise<TrackingEvent>;
}

const stubAusPost: AusPostClient = {
  async track() {
    return { status: "unknown" };
  },
};

export function getAusPostClient(): AusPostClient {
  // Real implementation drops in here once AUSPOST_API_KEY exists:
  //   if (process.env.AUSPOST_API_KEY) return realAusPostClient;
  return stubAusPost;
}

/**
 * AusPost article/consignment IDs come in a few shapes — domestic parcel
 * IDs are typically 13–20 digits, international "article" IDs follow the
 * UPU S10 format (2 letters, 9 digits, 2 letters, e.g. `JJ123456785AU`).
 * This accepts both loosely rather than modelling every real format
 * exactly, which would be guessing at a spec we don't have.
 */
const TRACKING_NUMBER_PATTERN = /^([A-Z0-9]{8,20}|[A-Z]{2}\d{9}[A-Z]{2})$/;

export function isValidAusPostTrackingNumber(raw: string): boolean {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, "");
  return TRACKING_NUMBER_PATTERN.test(cleaned);
}

export function normalizeTrackingNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Australia Post tracking — interface only. Automatic delivery detection
 * needs an AusPost merchant API account, which doesn't exist yet, so
 * `track()` is a stub that always reports "unknown". Nothing here fakes a
 * real API call or claims verification that isn't happening.
 *
 * Until AUSPOST_API_KEY (or equivalent) is set, delivery is confirmed
 * manually instead — the seller marks an order delivered from
 * /selling, or the buyer confirms it directly from /buying — see
 * POST /api/orders/[id]/deliver and POST /api/orders/[id]/release. Swap
 * `stubAusPost` for a real implementation of `AusPostClient` here and both
 * routes pick it up automatically; neither calls the Stripe or Supabase
 * SDKs directly, so nothing outside this file has to change.
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

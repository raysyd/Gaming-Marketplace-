// Rename or re-region the whole platform from here.
export const BRAND = {
  name: "Sidegrade",
  tagline: "Australia's marketplace for gaming PCs and parts",
  blurb:
    "Buy and sell gaming rigs, GPUs and peripherals across Australia, with payment held until the box actually arrives.",
  supportEmail: "support@sidegrade.com.au",
  // Where the platform ships and settles.
  regions: ["Australia"],
  regionLabel: "Australia",
  currency: "AUD",
  locale: "en-AU",
  feePercent: 8,
  // Upper bound of the shop price filter, in AUD.
  maxFilterPrice: 4000,
  // Flat shipping fee charged when a listing didn't opt into free shipping,
  // in AUD. One number, used everywhere shipping is computed or shown.
  shippingFlatRate: 25,
  // Seller's window to post after payment, and buyer's window to confirm
  // (or dispute) after delivery — deliberately the same constant, not two
  // literals, since the brief specifies both at the same length. Referenced
  // by the order-lifecycle logic and every place that states this in copy
  // (/trust, the buy box) so there's exactly one number on the record.
  orderWindowHours: 48,
  // A shipped parcel with no confirmed delivery (AusPost tracking isn't
  // wired up yet, and a seller can no longer mark their own order
  // delivered) auto-releases this many days after posting, unless the
  // buyer reports a problem first. Long enough for any domestic parcel.
  shippedAutoReleaseDays: 14,
  // Pickup orders never auto-release: the buyer confirms collection. A
  // pickup the seller hasn't handed over within this many days refunds.
  pickupHandoverDays: 7,
};

/** The platform fee in basis points — the one number the charge, the payout and the copy all use. */
export const PLATFORM_FEE_BPS = BRAND.feePercent * 100;

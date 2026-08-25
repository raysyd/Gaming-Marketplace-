export type Condition = "New" | "Like new" | "Used" | "For parts";
export type Category =
  | "Prebuilt PCs"
  | "Graphics Cards"
  | "Processors"
  | "Laptops"
  | "Monitors"
  | "Peripherals"
  | "Consoles";

export type Listing = {
  id: string;
  slug: string;
  title: string;
  /** Top-level taxonomy slug, e.g. "full-systems". */
  categorySlug: string;
  /** Second-level taxonomy slug, e.g. "gaming-pcs". */
  subcategorySlug: string;
  /** Which artwork to draw when there's no photo. */
  category: Category;
  price: number;
  compareAt?: number;
  condition: Condition;
  brand: string;
  specs: { label: string; value: string }[];
  fps1080p?: number;
  image: string;
  images?: string[];
  /** GPU-Z/CPU-Z/3DMark/Cinebench/CrystalDiskInfo screenshots — presence of any means the "Performance Verified" badge shows. */
  benchmarkImages?: string[];
  description: string;
  sellerId: string;
  sellerName: string;
  /** Average of real reviews (see lib/reviews-data.ts) — undefined/0 with sellerReviewCount 0 means "No reviews yet", never a fabricated default. */
  sellerRating: number;
  sellerReviewCount: number;
  /** Real count of released (completed) orders — not a fabricated column. */
  sellerSales: number;
  sellerVerified: boolean;
  location: string;
  state: string;
  shipsFree: boolean;
  acceptsOffers: boolean;
  watchers: number;
  stock: number;
  createdAt: string;
  status?: string;
};

export type ListingQuery = {
  q?: string;
  category?: string;
  sub?: string;
  sellerId?: string;
  conditions?: string[];
  minPrice?: number;
  maxPrice?: number;
  freeShipping?: boolean;
  verifiedOnly?: boolean;
  dealsOnly?: boolean;
  /** AU state the listing ships from — see lib/au-states.ts. Only ever populated for listings created after this filter shipped. */
  state?: string;
  /** `{ "Type": "NVMe SSD" }` — matched against `specs` via JSONB containment. */
  attrs?: Record<string, string>;
  sort?: "new" | "low" | "high" | "save" | "watched";
  status?: "active" | "sold";
  page?: number;
  perPage?: number;
};

export type ListingPage = {
  items: Listing[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
  /** True when these are the generated sample listings, not real inventory — drives the "Preview" banner. */
  isDemo: boolean;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  kind?: "text" | "offer" | "system";
  offerAmount?: number;
  /** Only set on kind "offer" — the real offers-table row this message announces. */
  offerId?: string;
  /** Live status of that row, joined in at read time (see lib/messages-data.ts) — not frozen at send time. */
  offerStatus?: "pending" | "accepted" | "declined" | "countered" | "redeemed";
  offerCounterAmount?: number;
};

export type Conversation = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage: string;
  buyerId: string;
  sellerId: string;
  otherPartyName: string;
  lastMessage: string;
  updatedAt: string;
  unread: number;
};

/**
 * "paid" doubles as the brief's "awaiting_postage" — payment confirmation
 * is the exact moment the seller's 48-hour posting window starts, so
 * there's no separate real-world event that would move an order from one
 * to the other. Shown to sellers as "Awaiting postage" and to buyers as
 * "Payment held", same underlying status. See lib/brand.ts orderWindowHours.
 */
export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "awaiting_confirmation"
  | "released"
  | "disputed"
  | "refunded";

export type Review = {
  id: string;
  orderId: string;
  reviewerId: string;
  reviewerName: string;
  sellerId: string;
  rating: number;
  body: string | null;
  createdAt: string;
};

export type Order = {
  id: string;
  listingId: string;
  listingTitle?: string;
  listingSlug?: string;
  listingImage?: string;
  buyerId: string;
  sellerId: string;
  sellerName?: string;
  amount: number;
  platformFee: number;
  shippingFee?: number;
  /** Units of this listing this order line covers — see supabase/09-cart-quantity.sql. */
  quantity: number;
  stripePaymentIntent: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  disputeReason: string | null;
  status: OrderStatus;
  createdAt: string;
};

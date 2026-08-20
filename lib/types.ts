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
  description: string;
  sellerId: string;
  sellerName: string;
  sellerRating: number;
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
  conditions?: string[];
  minPrice?: number;
  maxPrice?: number;
  freeShipping?: boolean;
  verifiedOnly?: boolean;
  dealsOnly?: boolean;
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
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  kind?: "text" | "offer";
  offerAmount?: number;
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
  stripePaymentIntent: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  disputeReason: string | null;
  status: OrderStatus;
  createdAt: string;
};

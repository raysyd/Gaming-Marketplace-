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
  sort?: "new" | "low" | "high" | "save" | "watched";
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

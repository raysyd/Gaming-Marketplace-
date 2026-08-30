import { BRAND } from "./brand";
import type { Listing } from "./types";

/**
 * schema.org JSON-LD — pure functions returning plain objects, rendered
 * by the caller as <script type="application/ld+json">
 * {JSON.stringify(...)}</script>. Never fabricates a rating or review
 * count that doesn't exist (same convention as everywhere else real
 * review data is shown in this codebase) — omits `aggregateRating`
 * entirely rather than a fake 5.0.
 */

// Structured data is read by crawlers, not a live request — there's no
// Request/headers() to derive an origin from without forcing this page
// dynamic (it's ISR-prerendered, see the page's own comment on that).
// NEXT_PUBLIC_SITE_URL is the real source of truth everywhere else in
// this codebase (see lib/site-url.ts); the fallback here is the actual
// stable production domain, never localhost — search engines should
// never see that even as a momentary misconfiguration.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://sidegrade.vercel.app").replace(/\/$/, "");
const ABSOLUTE = (path: string) => `${SITE_URL}${path}`;

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.name,
    url: SITE_URL,
    description: BRAND.blurb,
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND.name,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/shop?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/** schema.org's condition enum has no "like new" tier — New maps to
 * NewCondition, everything else (Used, Like new, For parts) to
 * UsedCondition, which is accurate rather than misleading; it just
 * doesn't distinguish finer grades schema.org itself doesn't model. */
function conditionSchema(condition: Listing["condition"]) {
  return condition === "New"
    ? "https://schema.org/NewCondition"
    : "https://schema.org/UsedCondition";
}

function availabilitySchema(listing: Listing) {
  if (listing.status === "sold") return "https://schema.org/OutOfStock";
  if (listing.status !== "active") return "https://schema.org/Discontinued";
  return listing.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
}

export function productSchema(listing: Listing, path: string) {
  const images = [listing.image, ...(listing.images ?? [])].filter(Boolean).map(ABSOLUTE);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description || listing.title,
    ...(images.length ? { image: images } : {}),
    brand: listing.brand ? { "@type": "Brand", name: listing.brand } : undefined,
    category: listing.category,
    url: ABSOLUTE(path),
    offers: {
      "@type": "Offer",
      url: ABSOLUTE(path),
      priceCurrency: BRAND.currency,
      price: listing.price,
      itemCondition: conditionSchema(listing.condition),
      availability: availabilitySchema(listing),
      seller: { "@type": "Person", name: listing.sellerName },
    },
    // Real seller review data, not a per-item rating (a used, one-off
    // item can't sensibly have its own review history) — omitted
    // entirely when there isn't any yet, rather than a fabricated 5.0.
    ...(listing.sellerReviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: listing.sellerRating,
            reviewCount: listing.sellerReviewCount,
          },
        }
      : {}),
  };
}

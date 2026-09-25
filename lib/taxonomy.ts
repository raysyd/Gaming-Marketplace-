export type SubCategory = { slug: string; name: string };
export type TopCategory = { slug: string; name: string; children: SubCategory[] };

/** Two-level catalogue, matching how gaming-hardware marketplaces organise stock. */
export const TAXONOMY: TopCategory[] = [
  {
    slug: "full-systems",
    name: "Full Systems",
    children: [
      { slug: "gaming-pcs", name: "Gaming PCs" },
      { slug: "gaming-laptops", name: "Gaming Laptops" },
      { slug: "workstations", name: "Workstations" },
      { slug: "mini-pcs", name: "Mini PCs" },
    ],
  },
  {
    slug: "pc-parts-and-components",
    name: "PC Parts & Components",
    children: [
      { slug: "graphics-cards", name: "Graphics Cards" },
      { slug: "processors", name: "Processors" },
      { slug: "memory", name: "Memory" },
      { slug: "storage", name: "Storage" },
      { slug: "motherboards", name: "Motherboards" },
      { slug: "power-supplies", name: "Power Supplies" },
      { slug: "cases", name: "Cases" },
      { slug: "cooling", name: "Fans & Cooling" },
      { slug: "cables-extensions", name: "Cables & Extensions" },
    ],
  },
  {
    slug: "peripherals",
    name: "Peripherals",
    children: [
      { slug: "monitors", name: "Monitors" },
      { slug: "keyboards", name: "Keyboards" },
      { slug: "mice", name: "Mice" },
      { slug: "headsets", name: "Headsets" },
    ],
  },
  {
    slug: "consoles",
    name: "Consoles",
    children: [
      { slug: "playstation", name: "PlayStation" },
      { slug: "xbox", name: "Xbox" },
      { slug: "nintendo", name: "Nintendo" },
      { slug: "handhelds", name: "Handhelds" },
    ],
  },
  {
    slug: "collectibles-and-parts",
    name: "Collectibles & For Parts",
    children: [
      { slug: "collectibles", name: "Collectibles" },
      { slug: "for-parts", name: "For Parts / Not Working" },
      { slug: "retro-hardware", name: "Retro Hardware" },
    ],
  },
];

export const ALL_SUBS = TAXONOMY.flatMap((t) =>
  t.children.map((c) => ({ ...c, parent: t.slug, parentName: t.name }))
);

export const findSub = (slug: string) => ALL_SUBS.find((s) => s.slug === slug);
export const findTop = (slug: string) => TAXONOMY.find((t) => t.slug === slug);

/**
 * The subcategory is the source of truth for where a listing lives — its
 * top-level category is always that subcategory's parent. Trusting a
 * separately-submitted category let the two disagree, and a listing whose
 * category_slug didn't match its subcategory never showed up when browsing
 * that category from the header.
 */
export function resolveCategory(subSlug: unknown, topSlug: unknown) {
  const sub = findSub(String(subSlug ?? ""));
  return {
    subcategorySlug: sub?.slug ?? "graphics-cards",
    categorySlug: sub?.parent ?? findTop(String(topSlug ?? ""))?.slug ?? "pc-parts-and-components",
  };
}

/** PostgREST `or` filter for "listed under this top-level category" —
 * matches on category_slug OR any of its subcategories, so rows saved
 * before resolveCategory() existed still appear in the right section. */
export function categoryOrFilter(topSlug: string): string | null {
  const top = findTop(topSlug);
  if (!top) return null;
  const subs = top.children.map((c) => c.slug).join(",");
  return `category_slug.eq.${top.slug},subcategory_slug.in.(${subs})`;
}

/** Which art to draw for a subcategory. */
export function artKindFor(sub: string): string {
  if (["gaming-pcs", "workstations", "mini-pcs"].includes(sub)) return "Prebuilt PCs";
  if (sub === "gaming-laptops") return "Laptops";
  if (sub === "graphics-cards") return "Graphics Cards";
  if (
    [
      "processors", "memory", "storage", "motherboards", "power-supplies", "cases", "cooling",
      "cables-extensions", "collectibles", "for-parts", "retro-hardware",
    ].includes(sub)
  )
    return "Processors";
  if (sub === "monitors") return "Monitors";
  if (["keyboards", "mice", "headsets"].includes(sub)) return "Peripherals";
  return "Consoles";
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

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
];

export const ALL_SUBS = TAXONOMY.flatMap((t) =>
  t.children.map((c) => ({ ...c, parent: t.slug, parentName: t.name }))
);

export const findSub = (slug: string) => ALL_SUBS.find((s) => s.slug === slug);
export const findTop = (slug: string) => TAXONOMY.find((t) => t.slug === slug);

/** Which art to draw for a subcategory. */
export function artKindFor(sub: string): string {
  if (["gaming-pcs", "workstations"].includes(sub)) return "Prebuilt PCs";
  if (sub === "gaming-laptops") return "Laptops";
  if (sub === "graphics-cards") return "Graphics Cards";
  if (["processors", "memory", "storage", "motherboards", "power-supplies", "cases", "cooling"].includes(sub))
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

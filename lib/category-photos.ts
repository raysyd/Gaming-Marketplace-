import type { Category } from "./types";

/**
 * Real, licensed stock photos (Unsplash License — free for commercial use;
 * see public/category/SOURCES.md for the source of each file) used as
 * fallback art wherever a listing has no seller-uploaded photo, and for
 * the homepage category tiles.
 *
 * These are generic representations of a category, never a specific
 * listing's actual condition — components/ProductImage.tsx pairs this
 * with a visible "Stock photo" badge so a buyer never mistakes one for a
 * real photo of the specific used item they're looking at.
 */
export const CATEGORY_PHOTOS: Record<Category, string> = {
  "Prebuilt PCs": "/category/full-systems.jpg",
  "Graphics Cards": "/category/pc-parts.jpg",
  Processors: "/category/processors.jpg",
  Laptops: "/category/laptops.jpg",
  Monitors: "/category/monitors.jpg",
  Peripherals: "/category/peripherals.jpg",
  Consoles: "/category/consoles.jpg",
};

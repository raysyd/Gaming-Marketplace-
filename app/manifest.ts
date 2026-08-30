import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

// Colors match app/globals.css's light-mode tokens directly — a
// manifest can't read CSS custom properties, so these are the same
// values as --color-paper/--color-chrome there, kept in sync by hand.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — ${BRAND.tagline}`,
    short_name: BRAND.name,
    description: BRAND.blurb,
    start_url: "/",
    display: "standalone",
    background_color: "#f6f6f6",
    theme_color: "#080808",
    icons: [
      { src: "/api/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/api/pwa-icon/512", sizes: "512x512", type: "image/png" },
    ],
  };
}

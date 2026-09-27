import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { publicSiteUrl } from "@/lib/public-site-url";
import { slugify } from "@/lib/taxonomy";

// Rebuilt at most hourly — new listings reach search engines without a
// database query on every crawler hit.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = publicSiteUrl();
  const staticPages: MetadataRoute.Sitemap = ["", "/shop", "/builds", "/pc-finder", "/about", "/trust", "/contact", "/terms", "/privacy"].map(
    (path) => ({ url: `${site}${path}`, changeFrequency: path === "" || path === "/shop" ? "hourly" : "monthly", priority: path === "" ? 1 : 0.6 })
  );

  const supabase = createPublicClient();
  if (!supabase) return staticPages;

  // Sitemaps cap at 50,000 URLs; RLS already limits this to active listings.
  const { data } = await supabase
    .from("listings")
    .select("id, slug, title, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(45000);

  const listings: MetadataRoute.Sitemap = (data ?? []).map((l) => ({
    url: `${site}/product/${l.id}/${l.slug ?? slugify(l.title ?? "")}`,
    lastModified: l.created_at ?? undefined,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticPages, ...listings];
}

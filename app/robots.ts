import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/public-site-url";

export default function robots(): MetadataRoute.Robots {
  const site = publicSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in and transactional pages: nothing to index, and crawling
      // them just burns requests on login redirects.
      disallow: ["/api/", "/admin", "/account", "/auth/", "/buying", "/selling", "/cart", "/messages", "/dashboard", "/orders", "/sell", "/wishlist", "/login"],
    },
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}

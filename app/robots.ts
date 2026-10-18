import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // Cart, checkout and order pages belong to one shopper's cookies; there is nothing to index.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/cart", "/checkout", "/orders/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

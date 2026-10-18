import type { MetadataRoute } from "next";
import { getServerApi } from "@/lib/api/server";
import { SITE_URL } from "@/lib/site";

// Built per request: the product list lives in D1, which is not reachable at build time.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await (await getServerApi()).listProducts();
  if (!catalog.ok) {
    throw new Error(`Sitemap could not read the catalog: ${catalog.failure.kind}`);
  }
  const productPages = catalog.data.products.map((product) => ({ url: `${SITE_URL}/products/${product.slug}` }));
  return [{ url: SITE_URL }, ...productPages, { url: `${SITE_URL}/terms` }];
}

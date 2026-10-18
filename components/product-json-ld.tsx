import type { Product } from "@/lib/api/contract";
import { SITE_URL } from "@/lib/site";

export function ProductJsonLd({ product }: { product: Product }) {
  const productUrl = `${SITE_URL}/products/${product.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: `${SITE_URL}${product.image.src}`,
    sku: product.slug,
    brand: { "@type": "Brand", name: "Kilnworth Studio" },
    offers: {
      "@type": "Offer",
      url: productUrl,
      price: (product.priceCents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: product.stockLeft > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    },
  };
  return (
    <script
      type="application/ld+json"
      // The pattern from the Next.js JSON-LD guide: our own catalog data, with "<" escaped so a
      // product text can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}

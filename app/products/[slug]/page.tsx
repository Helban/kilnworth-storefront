import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AddToCart } from "@/components/add-to-cart";
import { FetchFailure } from "@/components/fetch-failure";
import { ProductJsonLd } from "@/components/product-json-ld";
import { ProductPhoto } from "@/components/product-photo";
import { StockLabel } from "@/components/stock-label";
import { getServerApi } from "@/lib/api/server";
import { formatPrice } from "@/lib/money";
import { detailsFor } from "@/lib/product-details";

// generateMetadata and the page both need the product; this runs the lookup once per request.
const loadProduct = cache(async (slug: string) => (await getServerApi()).getProduct(slug));

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const lookup = await loadProduct(slug);
  if (!lookup.ok) return { title: "Product unavailable" };
  return {
    title: lookup.data.product.name,
    description: lookup.data.product.description,
    alternates: { canonical: `/products/${slug}` },
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const lookup = await loadProduct(slug);

  if (!lookup.ok) {
    if (lookup.failure.kind === "http" && lookup.failure.status === 404) notFound();
    return (
      <FetchFailure failure={lookup.failure} subject="this product" retryHref={`/products/${slug}`} />
    );
  }

  const { product } = lookup.data;
  const details = detailsFor(product.slug);
  return (
    <>
      <ProductJsonLd product={product} />
      <Link href="/" className="text-link">
        Back to the shop
      </Link>
      <article className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-16">
        {/* Stays in view on desktop while the details scroll past; top clears the sticky header. */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductPhoto
            image={product.image}
            alt={product.name}
            layout="large"
            loading="eager"
            sizes="(min-width: 75rem) 34rem, (min-width: 64rem) 45vw, 100vw"
            className={product.stockLeft === 0 ? "opacity-50" : ""}
          />
        </div>
        <div>
          <h1 className="text-4xl sm:text-5xl">{product.name}</h1>
          <p className="mt-4 text-2xl tabular-nums">{formatPrice(product.priceCents)}</p>
          <p className="mt-2">
            <StockLabel product={product} />
          </p>
          <AddToCart slug={product.slug} stockLeft={product.stockLeft} />
          <p className="mt-4 max-w-[65ch] text-lg leading-relaxed">{product.description}</p>
          {details.length > 0 && (
            <dl className="mt-8 grid max-w-[65ch] grid-cols-[auto_1fr] gap-x-8 gap-y-2 border-t border-line pt-6">
              {details.map((detail) => (
                <div key={detail.label} className="contents">
                  <dt className="font-semibold">{detail.label}</dt>
                  <dd className="text-ink-muted">{detail.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </article>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AddToCart } from "@/components/add-to-cart";
import { TileGrid } from "@/components/catalog-tiles";
import { FetchFailure } from "@/components/fetch-failure";
import { ProductGallery } from "@/components/product-gallery";
import { ProductJsonLd } from "@/components/product-json-ld";
import { StockLabel } from "@/components/stock-label";
import type { ApiResult } from "@/lib/api/client";
import type { Product, ProductListBody } from "@/lib/api/contract";
import { getServerApi } from "@/lib/api/server";
import { formatPrice } from "@/lib/money";
import { detailsFor } from "@/lib/product-details";

// generateMetadata and the page both need the product; this runs the lookup once per request.
const loadProduct = cache(async (slug: string) => (await getServerApi()).getProduct(slug));

const MORE_PIECES = 4;
// Below this many in-stock pieces in the same category, "More from this batch" fills up from the
// other categories.
const MIN_SAME_CATEGORY = 2;

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
  const api = await getServerApi();
  const [lookup, catalog] = await Promise.all([loadProduct(slug), api.listProducts()]);

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
          <ProductGallery product={product} />
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
          <details className="mt-8 max-w-[65ch] border-y border-line">
            <summary className="cursor-pointer py-3 font-semibold">
              Shipping and returns
            </summary>
            <div className="pb-6 leading-relaxed">
              <p>
                Flat $9.00 shipping within the US. Pieces leave the studio within three business days. Unused pieces
                can be returned within 30 days.
              </p>
              <Link href="/terms" className="text-link mt-2 inline-block">
                Full terms of sale
              </Link>
            </div>
          </details>
        </div>
      </article>
      <MoreFromThisBatch product={product} catalog={catalog} />
    </>
  );
}

function MoreFromThisBatch({ product, catalog }: { product: Product; catalog: ApiResult<ProductListBody> }) {
  if (!catalog.ok) {
    return (
      <div className="mt-16 sm:mt-24">
        <FetchFailure failure={catalog.failure} subject="more from this batch" retryHref={`/products/${product.slug}`} />
      </div>
    );
  }
  const pieces = morePiecesLike(product, catalog.data.products);
  if (pieces.length === 0) return null;

  return (
    <section aria-labelledby="more-heading" className="mt-16 sm:mt-24">
      <h2 id="more-heading" className="border-b border-line pb-4 text-3xl">
        More from this batch
      </h2>
      <div className="mt-8">
        <TileGrid products={pieces} />
      </div>
    </section>
  );
}

function morePiecesLike(product: Product, products: Product[]): Product[] {
  const others = products.filter((other) => other.slug !== product.slug && other.stockLeft > 0);
  const sameCategory = others.filter((other) => other.category === product.category);
  if (sameCategory.length >= MIN_SAME_CATEGORY) return sameCategory.slice(0, MORE_PIECES);
  const otherCategories = others.filter((other) => other.category !== product.category);
  return [...sameCategory, ...otherCategories].slice(0, MORE_PIECES);
}

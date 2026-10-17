import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { FetchFailure } from "@/components/fetch-failure";
import { StockLabel } from "@/components/stock-label";
import { getServerApi } from "@/lib/api/server";
import { formatPrice } from "@/lib/money";

// generateMetadata and the page both need the product; this runs the lookup once per request.
const loadProduct = cache(async (slug: string) => (await getServerApi()).getProduct(slug));

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const lookup = await loadProduct((await params).slug);
  return { title: lookup.ok ? lookup.data.product.name : "Product unavailable" };
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
  return (
    <>
      <Link href="/" className="text-sm font-medium underline underline-offset-2">
        Back to the shop
      </Link>
      <article className="mt-6 grid gap-8 md:grid-cols-2">
        <Image
          src={product.image.src}
          width={product.image.width}
          height={product.image.height}
          alt={product.name}
          loading="eager"
          fetchPriority="high"
          className="aspect-square w-full bg-stone-100 object-cover"
        />
        <div>
          <h1 className="font-serif text-3xl font-semibold">{product.name}</h1>
          <p className="mt-3 text-xl">{formatPrice(product.priceCents)}</p>
          <p className="mt-1 text-stone-600">
            <StockLabel stockLeft={product.stockLeft} />
          </p>
          <p className="mt-6 max-w-prose leading-relaxed">{product.description}</p>
        </div>
      </article>
    </>
  );
}

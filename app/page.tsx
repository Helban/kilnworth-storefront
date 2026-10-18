import type { Metadata } from "next";
import type { ReactNode } from "react";
import { OneOffRows, TileGrid, TilePair } from "@/components/catalog-tiles";
import { FetchFailure } from "@/components/fetch-failure";
import { HowABatchIsMade } from "@/components/how-a-batch-is-made";
import { ScrollToHashTarget } from "@/components/scroll-to-hash-target";
import { StudioHero } from "@/components/studio-hero";
import type { Product } from "@/lib/api/contract";
import { getServerApi } from "@/lib/api/server";
import { CATEGORY_NAMES, categoryHeadingId } from "@/lib/categories";
import type { ProductCategory } from "@/lib/store/products";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const STUDIO_FACTS = [
  "A new batch about every six weeks",
  "Ships within three business days",
  "30 days to return unused pieces",
];

export default async function CatalogPage() {
  const api = await getServerApi();
  const catalog = await api.listProducts();
  const products = catalog.ok ? catalog.data.products : [];

  return (
    <>
      <StudioHero />
      <ul className="flex flex-wrap gap-x-12 gap-y-2 border-b border-line py-5 text-ink-muted">
        {STUDIO_FACTS.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>

      <div id="pieces" className="mt-16 scroll-mt-24 sm:mt-24">
        {catalog.ok ? (
          <Catalog products={products} />
        ) : (
          <FetchFailure failure={catalog.failure} subject="the catalog" retryHref="/" />
        )}
      </div>
    </>
  );
}

function Catalog({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p className="text-ink-muted">Nothing is listed right now. Check back after the next firing.</p>;
  }
  const inCategory = (category: ProductCategory) => products.filter((product) => product.category === category);

  return (
    <div className="space-y-16 sm:space-y-24">
      <CategorySection category="mug">
        <TileGrid products={inCategory("mug")} />
      </CategorySection>
      <CategorySection category="bowl">
        <TileGrid products={inCategory("bowl")} />
      </CategorySection>
      <CategorySection category="vase">
        <TilePair products={inCategory("vase")} />
      </CategorySection>
      <HowABatchIsMade />
      <CategorySection category="one-off">
        <OneOffRows products={inCategory("one-off")} />
      </CategorySection>
      <ScrollToHashTarget />
    </div>
  );
}

function CategorySection({ category, children }: { category: ProductCategory; children: ReactNode }) {
  const headingId = categoryHeadingId(category);
  return (
    <section aria-labelledby={headingId}>
      {/* scroll-mt keeps the heading clear of the sticky header when a category link jumps here. */}
      <h2 id={headingId} className="scroll-mt-24 border-b border-line pb-4 text-3xl">
        {CATEGORY_NAMES[category]}
      </h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

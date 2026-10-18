import Link from "next/link";
import type { ReactNode } from "react";
import { FetchFailure } from "@/components/fetch-failure";
import { ProductPhoto } from "@/components/product-photo";
import { StockLabel } from "@/components/stock-label";
import type { Product } from "@/lib/api/contract";
import { getServerApi } from "@/lib/api/server";
import { formatPrice } from "@/lib/money";
import type { ProductCategory } from "@/lib/store/products";

const FEATURED_SLUG = "moon-jar";

const CATEGORY_HEADINGS: Record<ProductCategory, string> = {
  mug: "Mugs and cups",
  bowl: "Bowls",
  vase: "Vases",
  "one-off": "One of a kind",
};

export default async function CatalogPage() {
  const api = await getServerApi();
  const catalog = await api.listProducts();
  const products = catalog.ok ? catalog.data.products : [];
  const featured = products.find((product) => product.slug === FEATURED_SLUG);

  return (
    <>
      <section aria-labelledby="intro-heading" className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
        <div>
          <h1 id="intro-heading" className="text-5xl sm:text-6xl">
            Current batch
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-muted">
            Kilnworth Studio throws and glazes mugs, bowls and vases in small runs, a few of each at a time. Once a
            piece sells, it does not come back.
          </p>
        </div>
        {featured && (
          <Link href={`/products/${featured.slug}`} className="block">
            <ProductPhoto
              image={featured.image}
              alt={`${featured.name}, ${formatPrice(featured.priceCents)}`}
              layout="large"
              loading="eager"
              sizes="(min-width: 75rem) 34rem, (min-width: 64rem) 45vw, 100vw"
            />
          </Link>
        )}
      </section>

      <div className="mt-16 sm:mt-24">
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
      <CategorySection category="one-off">
        <OneOffRows products={inCategory("one-off")} />
      </CategorySection>
    </div>
  );
}

function CategorySection({ category, children }: { category: ProductCategory; children: ReactNode }) {
  return (
    <section aria-labelledby={`category-${category}`}>
      <h2 id={`category-${category}`} className="border-b border-line pb-4 text-3xl">
        {CATEGORY_HEADINGS[category]}
      </h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

// Mugs and bowls: four across on desktop, two on a phone.
function TileGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-8 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.slug}>
          <Link href={`/products/${product.slug}`} className="group block">
            <Photo product={product} layout="tile" />
            <NameAndPrice product={product} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Vases: two larger tiles side by side.
function TilePair({ products }: { products: Product[] }) {
  return (
    <ul className="grid gap-10 sm:grid-cols-2 sm:gap-8">
      {products.map((product) => (
        <li key={product.slug}>
          <Link href={`/products/${product.slug}`} className="group block">
            <Photo product={product} layout="large" sizes="(min-width: 75rem) 34rem, (min-width: 40rem) 45vw, 100vw" />
            <NameAndPrice product={product} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

// One-offs: a full-width row each, photo and text swapping sides from row to row on desktop.
function OneOffRows({ products }: { products: Product[] }) {
  return (
    <ul className="space-y-16">
      {products.map((product, index) => (
        <li key={product.slug} className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
          {/* The name below links to the same page; this second link stays out of the tab order. */}
          <Link
            href={`/products/${product.slug}`}
            aria-hidden="true"
            tabIndex={-1}
            className={`block ${index % 2 === 1 ? "md:order-last" : ""}`}
          >
            <Photo product={product} layout="large" sizes="(min-width: 75rem) 34rem, (min-width: 48rem) 45vw, 100vw" />
          </Link>
          <div>
            <h3 className="text-3xl">
              <Link href={`/products/${product.slug}`} className="name-link">
                {product.name}
              </Link>
            </h3>
            <p className="mt-4 max-w-[65ch] leading-relaxed">{product.description}</p>
            <p className="mt-4 text-lg font-semibold tabular-nums">{formatPrice(product.priceCents)}</p>
            <p className="mt-2">
              <StockLabel product={product} />
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

interface PhotoProps {
  product: Product;
  layout: "tile" | "large";
  sizes?: string;
}

// The name sits right next to the photo inside the same link, so the photo itself is decorative.
function Photo({ product, layout, sizes }: PhotoProps) {
  return (
    <ProductPhoto
      image={product.image}
      alt=""
      layout={layout}
      sizes={sizes}
      className={product.stockLeft === 0 ? "opacity-50" : ""}
    />
  );
}

function NameAndPrice({ product }: { product: Product }) {
  return (
    <>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4">
        <h3 className="text-xl decoration-1 underline-offset-4 group-hover:underline">{product.name}</h3>
        <p className="tabular-nums">{formatPrice(product.priceCents)}</p>
      </div>
      <p className="mt-1">
        <StockLabel product={product} />
      </p>
    </>
  );
}

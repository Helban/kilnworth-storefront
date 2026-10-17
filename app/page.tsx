import Image from "next/image";
import Link from "next/link";
import { FetchFailure } from "@/components/fetch-failure";
import { StockLabel } from "@/components/stock-label";
import type { Product } from "@/lib/api/contract";
import { getServerApi } from "@/lib/api/server";
import { formatPrice } from "@/lib/money";
import type { ProductCategory } from "@/lib/store/products";

const CATEGORY_HEADINGS: Record<ProductCategory, string> = {
  mug: "Mugs and cups",
  bowl: "Bowls",
  vase: "Vases",
  "one-off": "One of a kind",
};

export default async function CatalogPage() {
  const api = await getServerApi();
  const catalog = await api.listProducts();

  return (
    <>
      <h1 className="font-serif text-3xl font-semibold">Current batch</h1>
      <p className="mt-2 max-w-prose text-stone-600">
        Thrown and glazed in our workshop in small runs. When a piece sells out, it is gone until
        the next firing.
      </p>
      <div className="mt-8">
        {catalog.ok ? (
          <Catalog products={catalog.data.products} />
        ) : (
          <FetchFailure failure={catalog.failure} subject="the catalog" retryHref="/" />
        )}
      </div>
    </>
  );
}

function Catalog({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p className="text-stone-600">Nothing is listed right now. Check back after the next firing.</p>;
  }

  const sections = Object.entries(CATEGORY_HEADINGS)
    .map(([category, heading]) => ({
      category,
      heading,
      products: products.filter((product) => product.category === category),
    }))
    .filter((section) => section.products.length > 0);

  return (
    <div className="space-y-12">
      {sections.map((section, sectionIndex) => (
        <section key={section.category} aria-labelledby={`category-${section.category}`}>
          <h2 id={`category-${section.category}`} className="font-serif text-2xl font-semibold">
            {section.heading}
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {section.products.map((product, productIndex) => (
              <ProductTile
                key={product.slug}
                product={product}
                aboveTheFold={sectionIndex === 0 && productIndex < 2}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ProductTile({ product, aboveTheFold }: { product: Product; aboveTheFold: boolean }) {
  return (
    <li>
      <Link href={`/products/${product.slug}`} className="group block">
        <Image
          src={product.image.src}
          width={product.image.width}
          height={product.image.height}
          // The product name sits right under the image inside the same link.
          alt=""
          loading={aboveTheFold ? "eager" : "lazy"}
          fetchPriority={aboveTheFold ? "high" : "auto"}
          className="aspect-square w-full bg-stone-100 object-cover"
        />
        <h3 className="mt-3 font-medium group-hover:underline">{product.name}</h3>
        <p className="mt-1">{formatPrice(product.priceCents)}</p>
        <p className="mt-1 text-sm text-stone-600">
          <StockLabel stockLeft={product.stockLeft} />
        </p>
      </Link>
    </li>
  );
}

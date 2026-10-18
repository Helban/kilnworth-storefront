import Link from "next/link";
import type { Product } from "@/lib/api/contract";
import { formatPrice } from "@/lib/money";
import { ProductPhoto } from "./product-photo";
import { StockLabel } from "./stock-label";

// The three ways the catalog lays out products. The product page reuses TileGrid.

export function TileGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-8 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.slug}>
          <Link href={`/products/${product.slug}`} className="group block">
            <TilePhoto product={product} layout="tile" />
            <NameAndPrice product={product} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function TilePair({ products }: { products: Product[] }) {
  return (
    <ul className="grid gap-10 sm:grid-cols-2 sm:gap-8">
      {products.map((product) => (
        <li key={product.slug}>
          <Link href={`/products/${product.slug}`} className="group block">
            <TilePhoto product={product} layout="large" sizes="(min-width: 75rem) 34rem, (min-width: 40rem) 45vw, 100vw" />
            <NameAndPrice product={product} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function OneOffRows({ products }: { products: Product[] }) {
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
            <TilePhoto product={product} layout="large" sizes="(min-width: 75rem) 34rem, (min-width: 48rem) 45vw, 100vw" />
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

interface TilePhotoProps {
  product: Product;
  layout: "tile" | "large";
  sizes?: string;
}

// The name sits right next to the photo inside the same link, so the photo itself is decorative.
function TilePhoto({ product, layout, sizes }: TilePhotoProps) {
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

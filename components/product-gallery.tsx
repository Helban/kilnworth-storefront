"use client";

import { useState } from "react";
import type { Product } from "@/lib/api/contract";
import { glazePhoto } from "@/lib/product-photos";
import { ProductPhoto } from "./product-photo";

type View = "piece" | "glaze";

// The whole piece first, so it is what shows before (or without) JavaScript.
export function ProductGallery({ product }: { product: Pick<Product, "name" | "image" | "stockLeft"> }) {
  const [shownView, setShownView] = useState<View>("piece");
  const views = [
    { view: "piece", label: "Show the whole piece", image: product.image, alt: product.name },
    { view: "glaze", label: "Show the glaze up close", image: glazePhoto(product.image), alt: `${product.name}, glaze up close` },
  ] as const;
  const shown = shownView === "piece" ? views[0] : views[1];

  return (
    <div>
      <ProductPhoto
        image={shown.image}
        alt={shown.alt}
        layout="large"
        loading="eager"
        sizes="(min-width: 75rem) 34rem, (min-width: 64rem) 45vw, 100vw"
        className={product.stockLeft === 0 ? "opacity-50" : ""}
      />
      <div className="mt-4 flex gap-4">
        {views.map((option) => (
          <button
            key={option.view}
            type="button"
            aria-label={option.label}
            aria-pressed={option.view === shownView}
            onClick={() => setShownView(option.view)}
            // The pressed thumbnail gets a line under it rather than a frame around the photo.
            className="relative w-20 after:absolute after:inset-x-0 after:-bottom-2 after:h-0.5 aria-pressed:after:bg-ink"
          >
            <ProductPhoto image={option.image} alt="" layout="thumb" />
          </button>
        ))}
      </div>
    </div>
  );
}

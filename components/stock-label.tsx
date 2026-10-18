import type { Product } from "@/lib/api/contract";

const LOW_STOCK = 2;

// Low stock in clay, everything else in the muted ink. A one-off that is still there reads
// "One piece" rather than "1 left".
export function StockLabel({ product }: { product: Pick<Product, "category" | "stockLeft"> }) {
  if (product.stockLeft === 0) return <span className="text-ink-muted">Sold out</span>;
  if (product.category === "one-off" && product.stockLeft === 1) return <span className="text-clay">One piece</span>;
  const tone = product.stockLeft <= LOW_STOCK ? "text-clay" : "text-ink-muted";
  return <span className={tone}>{product.stockLeft} left</span>;
}

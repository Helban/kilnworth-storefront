import type { ProductRecord } from "@/lib/store/products";
import type { CartLine } from "./cookie";

// Flat rate for any US address. No free-shipping threshold and no sales tax yet; see NOTES.md.
export const SHIPPING_CENTS = 900;

export interface PricedLine {
  readonly product: ProductRecord;
  readonly quantity: number;
  readonly lineTotalCents: number;
}

export interface PricedCart {
  readonly lines: PricedLine[];
  readonly itemCount: number;
  readonly subtotalCents: number;
  readonly shippingCents: number;
  readonly totalCents: number;
  // True when some line asks for more than is left; checkout must refuse such a cart.
  readonly exceedsStock: boolean;
}

// Prices a cart from database records only. Lines whose product no longer exists are dropped.
export function priceCart(lines: readonly CartLine[], products: readonly ProductRecord[]): PricedCart {
  const productsBySlug = new Map(products.map((product) => [product.slug, product]));
  const pricedLines = lines.flatMap((line) => {
    const product = productsBySlug.get(line.slug);
    if (!product) return [];
    return [{ product, quantity: line.quantity, lineTotalCents: product.priceCents * line.quantity }];
  });

  const subtotalCents = sum(pricedLines.map((line) => line.lineTotalCents));
  const shippingCents = pricedLines.length > 0 ? SHIPPING_CENTS : 0;
  return {
    lines: pricedLines,
    itemCount: sum(pricedLines.map((line) => line.quantity)),
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    exceedsStock: pricedLines.some((line) => line.quantity > line.product.stockLeft),
  };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

import type { PricedCart } from "@/lib/cart/pricing";
import type { ProductRecord } from "@/lib/store/products";
import type { ApiErrorBody, Cart, CartBody, Product } from "./contract";

// Placeholders and real photos are both exported at this size; see public/products/.
const PRODUCT_IMAGE_SIZE = 800;

export function toProductBody(product: ProductRecord): Product {
  return {
    ...product,
    image: {
      src: `/products/${product.slug}.webp`,
      width: PRODUCT_IMAGE_SIZE,
      height: PRODUCT_IMAGE_SIZE,
    },
  };
}

export function apiError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } } satisfies ApiErrorBody, { status });
}

export function toCartBody(cart: PricedCart): Cart {
  return {
    lines: cart.lines.map(({ product, quantity, lineTotalCents }) => ({
      slug: product.slug,
      name: product.name,
      image: toProductBody(product).image,
      unitPriceCents: product.priceCents,
      quantity,
      lineTotalCents,
      stockLeft: product.stockLeft,
    })),
    itemCount: cart.itemCount,
    subtotalCents: cart.subtotalCents,
    shippingCents: cart.shippingCents,
    totalCents: cart.totalCents,
    exceedsStock: cart.exceedsStock,
  };
}

export function cartResponse(cart: PricedCart): Response {
  return Response.json({ cart: toCartBody(cart) } satisfies CartBody);
}

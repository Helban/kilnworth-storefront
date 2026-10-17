import type { ProductRecord } from "@/lib/store/products";
import type { ApiErrorBody, Product } from "./contract";

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

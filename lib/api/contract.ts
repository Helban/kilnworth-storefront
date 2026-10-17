import { z } from "zod";
import { PRODUCT_CATEGORIES } from "@/lib/store/products";

// The JSON the API promises. Route handlers build these shapes; the client refuses anything else.

const productSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  category: z.enum(PRODUCT_CATEGORIES),
  priceCents: z.number().int().positive(),
  stockLeft: z.number().int().nonnegative(),
  image: z.object({
    src: z.string().startsWith("/"),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
});

export const productListSchema = z.object({ products: z.array(productSchema) });
export const productDetailSchema = z.object({ product: productSchema });
export const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export type Product = z.infer<typeof productSchema>;
export type ProductListBody = z.infer<typeof productListSchema>;
export type ProductDetailBody = z.infer<typeof productDetailSchema>;
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

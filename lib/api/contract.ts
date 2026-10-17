import { z } from "zod";
import { PRODUCT_CATEGORIES } from "@/lib/store/products";

// The JSON the API promises. Route handlers build these shapes; the client refuses anything else.

export const slugSchema = z.string().regex(/^[a-z0-9-]{1,64}$/);
export const MAX_LINE_QUANTITY = 10;

const imageSchema = z.object({
  src: z.string().startsWith("/"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const productSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  category: z.enum(PRODUCT_CATEGORIES),
  priceCents: z.number().int().positive(),
  stockLeft: z.number().int().nonnegative(),
  image: imageSchema,
});

const cartLineSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  image: imageSchema,
  unitPriceCents: z.number().int().positive(),
  quantity: z.number().int().positive(),
  lineTotalCents: z.number().int().positive(),
  stockLeft: z.number().int().nonnegative(),
});

const cartSchema = z.object({
  lines: z.array(cartLineSchema),
  itemCount: z.number().int().nonnegative(),
  subtotalCents: z.number().int().nonnegative(),
  shippingCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
  exceedsStock: z.boolean(),
});

export const productListSchema = z.object({ products: z.array(productSchema) });
export const productDetailSchema = z.object({ product: productSchema });
export const cartBodySchema = z.object({ cart: cartSchema });

// "none" covers every case where the cart is not held as it stands: never held, the hold ran out,
// or the cart changed after the hold was taken.
const holdSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("held"),
    expiresAt: z.number().int().positive(),
    secondsLeft: z.number().int().nonnegative(),
  }),
  z.object({ status: z.literal("none") }),
]);

export const checkoutBodySchema = z.object({ checkout: z.object({ hold: holdSchema, cart: cartSchema }) });
export const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

// Request bodies, validated by the route handlers.
export const addCartLineRequestSchema = z.object({
  slug: slugSchema,
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
});
export const setCartLineRequestSchema = z.object({
  quantity: z.number().int().min(0).max(MAX_LINE_QUANTITY),
});

export type Product = z.infer<typeof productSchema>;
export type Cart = z.infer<typeof cartSchema>;
export type CartLineBody = z.infer<typeof cartLineSchema>;
export type CartBody = z.infer<typeof cartBodySchema>;
export type Hold = z.infer<typeof holdSchema>;
export type CheckoutBody = z.infer<typeof checkoutBodySchema>;
export type ProductListBody = z.infer<typeof productListSchema>;
export type ProductDetailBody = z.infer<typeof productDetailSchema>;
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

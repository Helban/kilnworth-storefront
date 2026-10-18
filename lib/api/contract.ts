import { z } from "zod";
import { ORDER_STATUSES } from "@/lib/store/orders";
import { PRODUCT_CATEGORIES } from "@/lib/store/products";
import { isUsStateCode } from "@/lib/us-states";

// Our CSP has no 'unsafe-eval'. Without this, zod probes `new Function` on first parse in the
// browser, the CSP blocks it, and Chrome logs a CSP issue that costs the page its Best Practices
// score. jitless is the same validation without the compiled fast path.
z.config({ jitless: true });

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
export const paymentBodySchema = z.object({ payment: z.object({ redirectUrl: z.url() }) });

const orderSchema = z.object({
  id: z.string().min(1),
  status: z.enum(ORDER_STATUSES),
  email: z.string(),
  shippingAddress: z.object({
    name: z.string(),
    line1: z.string(),
    line2: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
  }),
  lines: z.array(
    z.object({
      name: z.string().min(1),
      quantity: z.number().int().positive(),
      unitPriceCents: z.number().int().positive(),
      lineTotalCents: z.number().int().positive(),
    }),
  ),
  subtotalCents: z.number().int().nonnegative(),
  shippingCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
  createdAt: z.number().int(),
  paidAt: z.number().int().nullable(),
});

export const orderBodySchema = z.object({ order: orderSchema });
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    // Per-field messages on a 422, keyed by request field name.
    fields: z.record(z.string(), z.string()).optional(),
  }),
});

// Request bodies, validated by the route handlers.
export const addCartLineRequestSchema = z.object({
  slug: slugSchema,
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
});
export const setCartLineRequestSchema = z.object({
  quantity: z.number().int().min(0).max(MAX_LINE_QUANTITY),
});

// The checkout form and POST /api/checkout validate with this same schema, so the shopper sees the
// server's rules before submitting. The server still checks everything again.
export const checkoutDetailsSchema = z.object({
  email: z.email({ error: "Enter an email address, like name@example.com." }).max(254),
  name: z.string().trim().min(1, { error: "Enter the name for the delivery." }).max(100),
  line1: z.string().trim().min(1, { error: "Enter the street address." }).max(100),
  line2: z.string().trim().max(100),
  city: z.string().trim().min(1, { error: "Enter the city." }).max(60),
  state: z.string({ error: "Choose a state." }).refine(isUsStateCode, { error: "Choose a state." }),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, { error: "Enter a 5-digit ZIP code, like 97214." }),
  // Must be the boolean true. "on", "yes" or a missing field all count as not accepted.
  acceptTerms: z.literal(true, { error: "Accept the terms of sale to continue." }),
});

export type CheckoutDetails = z.infer<typeof checkoutDetailsSchema>;
export type Product = z.infer<typeof productSchema>;
export type Cart = z.infer<typeof cartSchema>;
export type CartLineBody = z.infer<typeof cartLineSchema>;
export type CartBody = z.infer<typeof cartBodySchema>;
export type Hold = z.infer<typeof holdSchema>;
export type CheckoutBody = z.infer<typeof checkoutBodySchema>;
export type PaymentBody = z.infer<typeof paymentBodySchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderBody = z.infer<typeof orderBodySchema>;
export type ProductListBody = z.infer<typeof productListSchema>;
export type ProductDetailBody = z.infer<typeof productDetailSchema>;
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

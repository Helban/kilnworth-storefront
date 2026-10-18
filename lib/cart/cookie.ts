import { z } from "zod";
import { MAX_LINE_QUANTITY, slugSchema } from "@/lib/api/contract";

// The cart cookie holds slugs and quantities only. Prices always come from the database when the
// cart is read, so editing the cookie can at most change what is in the cart, never what it costs.

export const CART_COOKIE = "cart";
const MAX_CART_LINES = 20;

export const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export function cookieOptions(maxAgeSeconds: number) {
  return { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: maxAgeSeconds } as const;
}

export const CART_COOKIE_OPTIONS = cookieOptions(THIRTY_DAYS_SECONDS);

export interface CartLine {
  readonly slug: string;
  readonly quantity: number;
}

const cartCookieSchema = z
  .array(z.object({ slug: slugSchema, quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY) }))
  .max(MAX_CART_LINES);

// Anything that does not parse is treated as an empty cart: the cookie is client-controlled input.
export function parseCartCookie(raw: string | undefined): CartLine[] {
  if (!raw) return [];
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch (error) {
    if (error instanceof SyntaxError) return [];
    throw error;
  }
  const parsed = cartCookieSchema.safeParse(decoded);
  return parsed.success ? parsed.data.map(({ slug, quantity }) => ({ slug, quantity })) : [];
}

export function serializeCart(lines: readonly CartLine[]): string {
  return JSON.stringify(lines.map(({ slug, quantity }) => ({ slug, quantity })));
}

export function setLineQuantity(lines: readonly CartLine[], slug: string, quantity: number): CartLine[] {
  const others = lines.filter((line) => line.slug !== slug);
  if (quantity === 0) return others;
  const position = lines.findIndex((line) => line.slug === slug);
  const updated = { slug, quantity };
  return position === -1
    ? [...others, updated]
    : [...others.slice(0, position), updated, ...others.slice(position)];
}

export function quantityOf(lines: readonly CartLine[], slug: string): number {
  return lines.find((line) => line.slug === slug)?.quantity ?? 0;
}

export function countItems(lines: readonly CartLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

export function canAddLine(lines: readonly CartLine[], slug: string): boolean {
  return lines.length < MAX_CART_LINES || lines.some((line) => line.slug === slug);
}

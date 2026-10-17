import "server-only";
import { cookies } from "next/headers";
import type { SqlDatabase } from "@/lib/store/database";
import { findProductsBySlugs } from "@/lib/store/products";
import { CART_COOKIE, CART_COOKIE_OPTIONS, parseCartCookie, serializeCart, type CartLine } from "./cookie";
import { priceCart, type PricedCart } from "./pricing";

export async function readCartLines(): Promise<CartLine[]> {
  return parseCartCookie((await cookies()).get(CART_COOKIE)?.value);
}

export async function writeCartLines(lines: readonly CartLine[]): Promise<void> {
  (await cookies()).set(CART_COOKIE, serializeCart(lines), CART_COOKIE_OPTIONS);
}

export async function priceCartLines(db: SqlDatabase, lines: readonly CartLine[]): Promise<PricedCart> {
  const products = await findProductsBySlugs(db, lines.map((line) => line.slug));
  return priceCart(lines, products);
}

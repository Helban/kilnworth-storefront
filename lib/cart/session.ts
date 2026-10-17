import "server-only";
import { cookies } from "next/headers";
import type { SqlDatabase } from "@/lib/store/database";
import { findProductBySlug, findProductsBySlugs, type ProductRecord } from "@/lib/store/products";
import { readOwnHeldQuantities } from "./checkout-hold";
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
  return priceCart(lines, await asSeenByShopper(db, products));
}

export async function findProductForShopper(db: SqlDatabase, slug: string): Promise<ProductRecord | null> {
  const product = await findProductBySlug(db, slug);
  return product && (await asSeenByShopper(db, [product]))[0];
}

// A shopper's own checkout hold is not "taken" from their point of view: stock left for them is
// what is free plus what they already hold. Without this, a held piece reads as sold out in the
// cart of the person holding it.
async function asSeenByShopper(db: SqlDatabase, products: ProductRecord[]): Promise<ProductRecord[]> {
  const held = await readOwnHeldQuantities(db, Date.now());
  return products.map((product) => ({ ...product, stockLeft: product.stockLeft + (held.get(product.slug) ?? 0) }));
}

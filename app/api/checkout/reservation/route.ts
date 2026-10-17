import type { CheckoutBody } from "@/lib/api/contract";
import { crossOriginRefused, isCrossOrigin } from "@/lib/api/requests";
import { apiError, toCartBody } from "@/lib/api/responses";
import { ensureHold, heldUntil } from "@/lib/cart/checkout-hold";
import { priceCartLines, readCartLines } from "@/lib/cart/session";
import { refuseShortStock } from "@/lib/cart/stock-check";
import { getDbWithExpiredHoldsReleased } from "@/lib/db";

// Starts checkout: holds every line in the cart for ten minutes, or none of them. Calling it again
// while the current hold still covers the cart returns that hold unchanged, so reloading or
// double-clicking never extends a hold.
export async function POST(request: Request) {
  if (isCrossOrigin(request)) return crossOriginRefused();
  const db = await getDbWithExpiredHoldsReleased();
  const lines = await readCartLines();
  if (lines.length === 0) return apiError(409, "cart_empty", "Your cart is empty.");

  const now = Date.now();
  const cart = await priceCartLines(db, lines);
  const hold = await ensureHold(db, lines, now);
  if (!hold.ok) return refuseShortStock(cart, hold.shortSlugs);
  return Response.json({ checkout: { hold: heldUntil(hold.expiresAt, now), cart: toCartBody(cart) } } satisfies CheckoutBody);
}

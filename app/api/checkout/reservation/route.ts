import type { CheckoutBody } from "@/lib/api/contract";
import { crossOriginRefused, isCrossOrigin } from "@/lib/api/requests";
import { apiError, toCartBody } from "@/lib/api/responses";
import { describeHold, heldUntil, readHeldReservationId, rememberReservation } from "@/lib/cart/checkout-hold";
import { priceCartLines, readCartLines } from "@/lib/cart/session";
import { getDbWithExpiredHoldsReleased } from "@/lib/db";
import { releaseReservation, reserveStock } from "@/lib/store/reservations";

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
  const current = await describeHold(db, lines, now);
  if (current.status === "held") {
    return Response.json({ checkout: { hold: current, cart: toCartBody(cart) } } satisfies CheckoutBody);
  }

  const previousId = await readHeldReservationId();
  if (previousId) await releaseReservation(db, previousId);

  const outcome = await reserveStock(db, lines, now);
  if (!outcome.ok) {
    const shortNames = cart.lines
      .filter((line) => outcome.shortSlugs.includes(line.product.slug))
      .map((line) => line.product.name);
    return apiError(
      409,
      "insufficient_stock",
      `Not enough left of: ${shortNames.join(", ")}. Change the quantity in your cart and try again.`,
    );
  }

  await rememberReservation(outcome.reservationId);
  const hold = heldUntil(outcome.expiresAt, now);
  return Response.json({ checkout: { hold, cart: toCartBody(cart) } } satisfies CheckoutBody);
}

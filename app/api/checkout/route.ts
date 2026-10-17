import type { CheckoutBody } from "@/lib/api/contract";
import { toCartBody } from "@/lib/api/responses";
import { describeHold } from "@/lib/cart/checkout-hold";
import { priceCartLines, readCartLines } from "@/lib/cart/session";
import { getDbWithExpiredHoldsReleased } from "@/lib/db";

export async function GET() {
  const db = await getDbWithExpiredHoldsReleased();
  const lines = await readCartLines();
  const cart = await priceCartLines(db, lines);
  const hold = await describeHold(db, lines, Date.now());
  return Response.json({ checkout: { hold, cart: toCartBody(cart) } } satisfies CheckoutBody);
}

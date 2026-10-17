import { addCartLineRequestSchema } from "@/lib/api/contract";
import { crossOriginRefused, isCrossOrigin, readJsonBody } from "@/lib/api/requests";
import { apiError, cartResponse } from "@/lib/api/responses";
import { canAddLine, quantityOf, setLineQuantity } from "@/lib/cart/cookie";
import { findProductForShopper, priceCartLines, readCartLines, writeCartLines } from "@/lib/cart/session";
import { refuseQuantity } from "@/lib/cart/stock-check";
import { getDbWithExpiredHoldsReleased } from "@/lib/db";

// Adds to whatever quantity of the product the cart already holds.
export async function POST(request: Request) {
  if (isCrossOrigin(request)) return crossOriginRefused();
  const parsed = await readJsonBody(request, addCartLineRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { slug, quantity } = parsed.body;

  const db = await getDbWithExpiredHoldsReleased();
  const product = await findProductForShopper(db, slug);
  if (!product) return apiError(404, "product_not_found", "This piece is no longer listed.");

  const lines = await readCartLines();
  if (!canAddLine(lines, slug)) {
    return apiError(409, "cart_full", "The cart cannot hold more different pieces.");
  }
  const inCart = quantityOf(lines, slug);
  const refusal = refuseQuantity(product, inCart + quantity, inCart);
  if (refusal) return refusal;

  const updated = setLineQuantity(lines, slug, inCart + quantity);
  await writeCartLines(updated);
  return cartResponse(await priceCartLines(db, updated));
}

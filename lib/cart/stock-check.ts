import { MAX_LINE_QUANTITY } from "@/lib/api/contract";
import { apiError } from "@/lib/api/responses";
import type { ProductRecord } from "@/lib/store/products";

// The cart refuses quantities that are not available right now. This is a courtesy check for the
// shopper; the guarantee comes from the reservation taken at checkout.
export function refuseQuantity(product: ProductRecord, quantity: number, alreadyInCart = 0): Response | null {
  if (quantity > MAX_LINE_QUANTITY) {
    return apiError(409, "line_limit", `You can order at most ${MAX_LINE_QUANTITY} of one piece.`);
  }
  if (quantity > product.stockLeft) {
    return apiError(409, "insufficient_stock", describeShortfall(product.stockLeft, alreadyInCart));
  }
  return null;
}

function describeShortfall(stockLeft: number, alreadyInCart: number): string {
  if (stockLeft === 0) return "This piece has sold out.";
  if (alreadyInCart === 0) return `Only ${stockLeft} left.`;
  return `Only ${stockLeft} left, and your cart already has ${alreadyInCart}.`;
}

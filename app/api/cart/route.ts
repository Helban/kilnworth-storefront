import { cartResponse } from "@/lib/api/responses";
import { priceCartLines, readCartLines } from "@/lib/cart/session";
import { getDbWithExpiredHoldsReleased } from "@/lib/db";

export async function GET() {
  return cartResponse(await priceCartLines(await getDbWithExpiredHoldsReleased(), await readCartLines()));
}

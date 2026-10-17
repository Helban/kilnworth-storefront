import { cartResponse } from "@/lib/api/responses";
import { priceCartLines, readCartLines } from "@/lib/cart/session";
import { getDb } from "@/lib/db";

export async function GET() {
  return cartResponse(await priceCartLines(await getDb(), await readCartLines()));
}

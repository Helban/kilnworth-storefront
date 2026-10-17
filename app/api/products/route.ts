import type { ProductListBody } from "@/lib/api/contract";
import { toProductBody } from "@/lib/api/responses";
import { getDbWithExpiredHoldsReleased } from "@/lib/db";
import { listProducts } from "@/lib/store/products";

export async function GET() {
  const products = await listProducts(await getDbWithExpiredHoldsReleased());
  return Response.json({ products: products.map(toProductBody) } satisfies ProductListBody);
}

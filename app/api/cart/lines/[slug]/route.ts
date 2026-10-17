import { setCartLineRequestSchema, slugSchema } from "@/lib/api/contract";
import { crossOriginRefused, isCrossOrigin, readJsonBody } from "@/lib/api/requests";
import { apiError, cartResponse } from "@/lib/api/responses";
import { setLineQuantity } from "@/lib/cart/cookie";
import { priceCartLines, readCartLines, writeCartLines } from "@/lib/cart/session";
import { refuseQuantity } from "@/lib/cart/stock-check";
import { getDb } from "@/lib/db";
import { findProductBySlug } from "@/lib/store/products";

// Sets the quantity of one line. Zero removes it.
export async function PUT(request: Request, { params }: RouteContext<"/api/cart/lines/[slug]">) {
  if (isCrossOrigin(request)) return crossOriginRefused();
  const { slug } = await params;
  if (!slugSchema.safeParse(slug).success) {
    return apiError(404, "product_not_found", "This piece is no longer listed.");
  }
  const parsed = await readJsonBody(request, setCartLineRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { quantity } = parsed.body;

  const db = await getDb();
  if (quantity > 0) {
    const product = await findProductBySlug(db, slug);
    if (!product) return apiError(404, "product_not_found", "This piece is no longer listed.");
    const refusal = refuseQuantity(product, quantity);
    if (refusal) return refusal;
  }

  const updated = setLineQuantity(await readCartLines(), slug, quantity);
  await writeCartLines(updated);
  return cartResponse(await priceCartLines(db, updated));
}

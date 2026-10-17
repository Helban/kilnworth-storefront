import type { ProductDetailBody } from "@/lib/api/contract";
import { apiError, toProductBody } from "@/lib/api/responses";
import { getDb } from "@/lib/db";
import { findProductBySlug } from "@/lib/store/products";

const SLUG_PATTERN = /^[a-z0-9-]{1,64}$/;

export async function GET(_request: Request, { params }: RouteContext<"/api/products/[slug]">) {
  const { slug } = await params;
  const product = SLUG_PATTERN.test(slug) ? await findProductBySlug(await getDb(), slug) : null;
  if (!product) return apiError(404, "product_not_found", "There is no product at this address.");
  return Response.json({ product: toProductBody(product) } satisfies ProductDetailBody);
}

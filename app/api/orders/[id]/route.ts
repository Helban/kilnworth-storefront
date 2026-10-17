import { z } from "zod";
import type { OrderBody } from "@/lib/api/contract";
import { apiError, toOrderBody } from "@/lib/api/responses";
import { ownsOrder } from "@/lib/cart/order-cookie";
import { getDb } from "@/lib/db";
import { findOrder } from "@/lib/store/orders";

// Someone else's order answers exactly like a missing one, so ids cannot be probed.
export async function GET(_request: Request, { params }: RouteContext<"/api/orders/[id]">) {
  const { id } = await params;
  const visible = z.uuid().safeParse(id).success && (await ownsOrder(id));
  const order = visible ? await findOrder(await getDb(), id) : null;
  if (!order) return apiError(404, "order_not_found", "There is no order at this address.");
  return Response.json({ order: toOrderBody(order) } satisfies OrderBody);
}

import { NextResponse, type NextRequest } from "next/server";
import { forgetCart, ownsOrder } from "@/lib/cart/order-cookie";

// Stripe's success_url. Arriving here does not confirm anything (only the webhook does); it means
// the shopper finished on Stripe's page, so their cart and hold are spent and can be cleared.
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("order") ?? "";
  if (await ownsOrder(orderId)) await forgetCart();
  return NextResponse.redirect(new URL(`/orders/${encodeURIComponent(orderId)}`, request.url), 303);
}

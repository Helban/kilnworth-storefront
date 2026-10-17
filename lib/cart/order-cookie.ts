import "server-only";
import { cookies } from "next/headers";

// Guest checkout has no accounts, so an order belongs to the browser that placed it: the order id
// (a random UUID) is kept in an HttpOnly cookie, and only that browser can read the order back.
const ORDER_COOKIE = "order";
const ORDER_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  // Lax, not Strict: the cookie has to come along when Stripe sends the shopper back to us.
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
} as const;

export async function rememberOrder(orderId: string): Promise<void> {
  (await cookies()).set(ORDER_COOKIE, orderId, ORDER_COOKIE_OPTIONS);
}

export async function ownsOrder(orderId: string): Promise<boolean> {
  return (await cookies()).get(ORDER_COOKIE)?.value === orderId;
}

// After payment the cart and its hold are spent. The order cookie stays so the shopper can come back
// to the confirmation page.
export async function forgetCart(): Promise<void> {
  const jar = await cookies();
  jar.delete("cart");
  jar.delete("checkout");
}

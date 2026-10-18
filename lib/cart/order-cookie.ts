import "server-only";
import { cookies } from "next/headers";
import { CART_COOKIE, cookieOptions, THIRTY_DAYS_SECONDS } from "./cookie";
import { CHECKOUT_COOKIE } from "./checkout-hold";

// Guest checkout has no accounts, so an order belongs to the browser that placed it: the order id
// (a random UUID) is kept in an HttpOnly cookie, and only that browser can read the order back.
const ORDER_COOKIE = "order";
// SameSite is Lax, not Strict (set in cookieOptions): the cookie has to come along when Stripe
// sends the shopper back to us.
const ORDER_COOKIE_OPTIONS = cookieOptions(THIRTY_DAYS_SECONDS);

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
  jar.delete(CART_COOKIE);
  jar.delete(CHECKOUT_COOKIE);
}

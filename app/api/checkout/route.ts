import Stripe from "stripe";
import { z } from "zod";
import { checkoutDetailsSchema, type CheckoutBody, type PaymentBody } from "@/lib/api/contract";
import { crossOriginRefused, isCrossOrigin, readJsonBody, validationFailed } from "@/lib/api/requests";
import { apiError, toCartBody } from "@/lib/api/responses";
import { describeHold, ensureHold } from "@/lib/cart/checkout-hold";
import { rememberOrder } from "@/lib/cart/order-cookie";
import { priceCartLines, readCartLines } from "@/lib/cart/session";
import { refuseShortStock } from "@/lib/cart/stock-check";
import { getDbWithExpiredHoldsReleased } from "@/lib/db";
import { createCheckoutSession, STRIPE_SESSION_TTL_MS } from "@/lib/payments/checkout-session";
import { getStripe } from "@/lib/payments/env";
import { PaymentsNotConfiguredError, type StripeSetup } from "@/lib/payments/stripe";
import { attachStripeSession, createOrder } from "@/lib/store/orders";
import { extendReservation } from "@/lib/store/reservations";

// The hold must outlive the Stripe session, or a shopper could pay for stock already released.
const HOLD_GRACE_MS = 5 * 60 * 1000;

export async function GET() {
  const db = await getDbWithExpiredHoldsReleased();
  const lines = await readCartLines();
  const cart = await priceCartLines(db, lines);
  const hold = await describeHold(db, lines, Date.now());
  return Response.json({ checkout: { hold, cart: toCartBody(cart) } } satisfies CheckoutBody);
}

// Submits checkout. Everything a shopper can get wrong is rejected with 422 before the database or
// Stripe is touched, terms acceptance included. Then the stock is re-checked, the order is stored
// with the time the terms were accepted, and the shopper is handed to Stripe Checkout.
export async function POST(request: Request) {
  if (isCrossOrigin(request)) return crossOriginRefused();
  const body = await readJsonBody(request, z.unknown());
  if (!body.ok) return body.response;
  const details = checkoutDetailsSchema.safeParse(body.body);
  if (!details.success) return validationFailed(details.error);

  let payments: StripeSetup;
  try {
    payments = await getStripe();
  } catch (error) {
    if (!(error instanceof PaymentsNotConfiguredError)) throw error;
    console.error(error.message);
    return apiError(503, "payments_unavailable", "Payments are not set up on this server yet.");
  }

  const db = await getDbWithExpiredHoldsReleased();
  const lines = await readCartLines();
  if (lines.length === 0) return apiError(409, "cart_empty", "Your cart is empty.");

  const now = Date.now();
  const cart = await priceCartLines(db, lines);
  const hold = await ensureHold(db, lines, now);
  if (!hold.ok) return refuseShortStock(cart, hold.shortSlugs);

  const sessionExpiresAt = now + STRIPE_SESSION_TTL_MS;
  if (!(await extendReservation(db, hold.reservationId, sessionExpiresAt + HOLD_GRACE_MS))) {
    return apiError(409, "hold_lost", "Your hold on these pieces ran out. Go back to your cart and try again.");
  }

  const { email, name, line1, line2, city, state, postalCode } = details.data;
  const address = { name, line1, line2, city, state, postalCode };
  const orderId = await createOrder(
    db,
    { reservationId: hold.reservationId, email, address, cart, termsAcceptedAt: now },
    now,
  );

  let session: { id: string; url: string };
  try {
    session = await createCheckoutSession(payments.stripe, {
      orderId,
      email,
      address,
      cart,
      origin: new URL(request.url).origin,
      expiresAt: sessionExpiresAt,
    });
  } catch (error) {
    if (!(error instanceof Stripe.errors.StripeError)) throw error;
    console.error("Stripe Checkout Session failed", orderId, error.type, error.message);
    return apiError(
      502,
      "payment_provider_error",
      "The payment provider did not respond. Your pieces are still held; try again in a moment.",
    );
  }

  await attachStripeSession(db, orderId, session.id);
  await rememberOrder(orderId);
  return Response.json({ payment: { redirectUrl: session.url } } satisfies PaymentBody, { status: 201 });
}

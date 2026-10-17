import type Stripe from "stripe";
import type { PricedCart } from "@/lib/cart/pricing";
import type { ShippingAddress } from "@/lib/store/orders";

// Stripe does not allow a Checkout Session to expire sooner than 30 minutes after it is created.
export const STRIPE_SESSION_TTL_MS = 30 * 60 * 1000;

export interface PaymentHandoff {
  readonly orderId: string;
  readonly email: string;
  readonly address: ShippingAddress;
  readonly cart: PricedCart;
  readonly origin: string;
  readonly expiresAt: number;
}

// Amounts come from the server-priced cart, never from the browser.
export async function createCheckoutSession(
  stripe: Stripe,
  handoff: PaymentHandoff,
): Promise<{ id: string; url: string }> {
  const { address, cart } = handoff;
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: handoff.orderId,
      metadata: { order_id: handoff.orderId },
      customer_email: handoff.email,
      line_items: cart.lines.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: "usd",
          unit_amount: line.product.priceCents,
          product_data: { name: line.product.name },
        },
      })),
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: "US flat rate",
            fixed_amount: { amount: cart.shippingCents, currency: "usd" },
          },
        },
      ],
      payment_intent_data: {
        shipping: {
          name: address.name,
          address: {
            line1: address.line1,
            line2: address.line2 || undefined,
            city: address.city,
            state: address.state,
            postal_code: address.postalCode,
            country: "US",
          },
        },
      },
      expires_at: Math.floor(handoff.expiresAt / 1000),
      success_url: `${handoff.origin}/orders/${handoff.orderId}`,
      cancel_url: `${handoff.origin}/checkout`,
    },
    // A retried request for the same order gets the same session instead of a second one.
    { idempotencyKey: `checkout-session-${handoff.orderId}` },
  );
  if (!session.url) throw new Error(`Stripe returned session ${session.id} without a URL`);
  return { id: session.id, url: session.url };
}

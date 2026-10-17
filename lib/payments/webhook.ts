import type Stripe from "stripe";
import type { SqlDatabase } from "@/lib/store/database";
import { recordExpiredCheckout, recordPaidCheckout, type ExpiredOutcome, type PaidOutcome } from "@/lib/store/payments";

export type WebhookOutcome = PaidOutcome | ExpiredOutcome | "awaiting_payment" | "ignored";

// Acts on a verified Stripe event. Card payments arrive as checkout.session.completed with
// payment_status "paid"; delayed methods complete later through async_payment_succeeded.
export async function handleStripeEvent(db: SqlDatabase, event: Stripe.Event, now: number): Promise<WebhookOutcome> {
  switch (event.type) {
    case "checkout.session.completed":
      if (event.data.object.payment_status !== "paid") return "awaiting_payment";
      return recordPaidCheckout(db, paidCheckoutFrom(event, event.data.object), now);
    case "checkout.session.async_payment_succeeded":
      return recordPaidCheckout(db, paidCheckoutFrom(event, event.data.object), now);
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed":
      return recordExpiredCheckout(db, eventRef(event, event.data.object), now);
    default:
      return "ignored";
  }
}

function paidCheckoutFrom(event: Stripe.Event, session: Stripe.Checkout.Session) {
  return {
    ...eventRef(event, session),
    sessionId: session.id,
    amountTotal: session.amount_total ?? 0,
    currency: session.currency ?? "",
  };
}

function eventRef(event: Stripe.Event, session: Stripe.Checkout.Session) {
  // Set by createCheckoutSession; an event without it cannot match any order and is reported as such.
  const orderId = session.metadata?.order_id ?? session.client_reference_id ?? "";
  return { eventId: event.id, eventType: event.type, orderId };
}

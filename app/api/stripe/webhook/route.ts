import Stripe from "stripe";
import { apiError } from "@/lib/api/responses";
import { getDb } from "@/lib/db";
import { getStripe } from "@/lib/payments/env";
import { PaymentsNotConfiguredError, type StripeSetup } from "@/lib/payments/stripe";
import { handleStripeEvent } from "@/lib/payments/webhook";

// Orders are confirmed here, never by the browser coming back from Stripe. Only a request signed
// with the webhook secret is believed. Answering non-2xx makes Stripe retry, which is safe because
// every event is applied at most once.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return apiError(400, "missing_signature", "The Stripe-Signature header is missing.");

  let payments: StripeSetup;
  try {
    payments = await getStripe();
  } catch (error) {
    if (!(error instanceof PaymentsNotConfiguredError)) throw error;
    // eslint-disable-next-line no-console -- tells the operator why payments are off; there is no logger module
    console.error(error.message);
    return apiError(503, "payments_unavailable", "Payments are not set up on this server yet.");
  }

  // The signature covers the exact bytes Stripe sent, so read the body as text, unparsed.
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await payments.stripe.webhooks.constructEventAsync(
      payload,
      signature,
      payments.webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (error) {
    if (!(error instanceof Stripe.errors.StripeSignatureVerificationError)) throw error;
    // eslint-disable-next-line no-console -- deliberate warning, documented in NOTES.md
    console.warn("Refused a Stripe webhook with an invalid signature");
    return apiError(400, "invalid_signature", "The webhook signature does not match.");
  }

  const outcome = await handleStripeEvent(await getDb(), event, Date.now());
  if (outcome === "needs_review" || outcome === "unknown_order") {
    // eslint-disable-next-line no-console -- deliberate warning, documented in NOTES.md
    console.warn("Stripe event needs a person to look at it", event.id, event.type, outcome);
  }
  return Response.json({ received: true, outcome });
}

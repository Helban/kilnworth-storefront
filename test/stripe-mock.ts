import { createStripeClient, type StripeSetup } from "@/lib/payments/stripe";

// Pinned by digest so every run validates requests against the same copy of Stripe's API spec.
// package.json's "stripe-mock" script uses the same image.
export const STRIPE_MOCK_IMAGE =
  "stripe/stripe-mock@sha256:aeb96b83e87a893d2ac005e363ac01ffa6e59a5ad85b49c155dfc9129de02e78";
export const STRIPE_MOCK_URL = process.env.STRIPE_MOCK_URL ?? "http://localhost:12111";
export const TEST_WEBHOOK_SECRET = "whsec_kilnworth_test_secret";

// A real Stripe SDK client that talks to stripe-mock, which checks every request against Stripe's
// OpenAPI spec and answers with fixture objects.
export function stripeMockSetup(): StripeSetup {
  return { stripe: createStripeClient("sk_test_kilnworth", STRIPE_MOCK_URL), webhookSecret: TEST_WEBHOOK_SECRET };
}

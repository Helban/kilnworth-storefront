import Stripe from "stripe";
import { z } from "zod";

// Fails closed: only Stripe test keys are accepted, so this code cannot take a real payment even
// if a live key is configured by mistake.
const stripeEnvSchema = z.object({
  STRIPE_SECRET_KEY: z.string().startsWith("sk_test_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  // Points the SDK at stripe-mock (local development and tests) instead of api.stripe.com.
  STRIPE_API_BASE: z.url({ protocol: /^https?$/ }).optional(),
});

export class PaymentsNotConfiguredError extends Error {
  constructor(missingOrInvalid: string[]) {
    super(`Stripe test-mode settings missing or invalid: ${missingOrInvalid.join(", ")}`);
    this.name = "PaymentsNotConfiguredError";
  }
}

export interface StripeSetup {
  readonly stripe: Stripe;
  readonly webhookSecret: string;
}

// Reads the Worker's environment (vars and secrets). Throws PaymentsNotConfiguredError, naming only
// the settings at fault and never their values.
export function stripeFromEnv(env: unknown): StripeSetup {
  const parsed = stripeEnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new PaymentsNotConfiguredError(parsed.error.issues.map((issue) => issue.path.join(".")));
  }
  return {
    stripe: createStripeClient(parsed.data.STRIPE_SECRET_KEY, parsed.data.STRIPE_API_BASE),
    webhookSecret: parsed.data.STRIPE_WEBHOOK_SECRET,
  };
}

export function createStripeClient(secretKey: string, apiBase?: string): Stripe {
  const base = apiBase ? new URL(apiBase) : null;
  return new Stripe(secretKey, {
    // The fetch client works the same in Node (tests) and in workerd (production).
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 1,
    ...(base && {
      host: base.hostname,
      port: base.port,
      protocol: base.protocol === "http:" ? "http" : "https",
    }),
  });
}

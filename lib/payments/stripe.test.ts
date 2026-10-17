import { describe, expect, it } from "vitest";
import { PaymentsNotConfiguredError, stripeFromEnv } from "./stripe";

describe("stripeFromEnv", () => {
  it("accepts test-mode settings", () => {
    const setup = stripeFromEnv({ STRIPE_SECRET_KEY: "sk_test_abc", STRIPE_WEBHOOK_SECRET: "whsec_abc" });

    expect(setup.webhookSecret).toBe("whsec_abc");
  });

  it("refuses a live key, naming the setting but never echoing the key", () => {
    const configure = () =>
      stripeFromEnv({ STRIPE_SECRET_KEY: "sk_live_do_not_use", STRIPE_WEBHOOK_SECRET: "whsec_abc" });

    expect(configure).toThrow(PaymentsNotConfiguredError);
    expect(configure).toThrow(/STRIPE_SECRET_KEY/);
    expect(configure).not.toThrow(/sk_live_do_not_use/);
  });

  it("refuses when settings are missing", () => {
    expect(() => stripeFromEnv({})).toThrow(/STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET/);
  });
});

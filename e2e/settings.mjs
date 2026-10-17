export const E2E_PORT = 8788;
export const E2E_STATE_DIR = ".next/cache/e2e-state";
// Test-mode placeholders for the run. stripe-mock accepts any key shaped like sk_test_123.
export const E2E_STRIPE = {
  STRIPE_SECRET_KEY: "sk_test_123",
  STRIPE_WEBHOOK_SECRET: "whsec_e2e_only",
  STRIPE_API_BASE: "http://localhost:12111",
};

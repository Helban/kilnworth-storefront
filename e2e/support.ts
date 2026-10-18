import { readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import Stripe from "stripe";
import { E2E_STATE_DIR, E2E_STRIPE } from "./settings.mjs";

export async function addToCart(page: Page, slug: string): Promise<void> {
  await page.goto(`/products/${slug}`);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();
}

export async function startCheckout(page: Page): Promise<void> {
  await page.goto("/cart");
  await page.getByRole("button", { name: "Check out" }).click();
  await page.waitForURL("**/checkout");
}

export async function fillShippingDetails(page: Page): Promise<void> {
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Street address").fill("12 Kiln Lane");
  await page.getByLabel("City").fill("Portland");
  await page.getByLabel("State").selectOption("OR");
  await page.getByLabel("ZIP code").fill("97214");
}

// stripe-mock hands back a fixture URL on checkout.stripe.com. Stand in for Stripe's hosted page.
export async function interceptStripeCheckout(page: Page): Promise<void> {
  await page.route("https://checkout.stripe.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<h1>Stripe Checkout stand-in</h1>" }),
  );
}

interface StoredOrder {
  id: string;
  stripe_session_id: string;
  total_cents: number;
}

function isStoredOrder(row: unknown): row is StoredOrder {
  if (typeof row !== "object" || row === null) return false;
  const columns = row as Record<string, unknown>;
  return (
    typeof columns.id === "string" &&
    typeof columns.stripe_session_id === "string" &&
    typeof columns.total_cents === "number"
  );
}

// The test plays Stripe here, and Stripe knows the session it created. Read it from the local D1
// file the preview server writes to.
export function latestOrder(): StoredOrder {
  const dir = join(E2E_STATE_DIR, "v3", "d1", "miniflare-D1DatabaseObject");
  const file = readdirSync(dir).find((name) => name.endsWith(".sqlite") && name !== "metadata.sqlite");
  if (!file) throw new Error(`No D1 database file in ${dir}`);
  const sqlite = new DatabaseSync(join(dir, file), { readOnly: true });
  const order: unknown = sqlite
    .prepare("SELECT id, stripe_session_id, total_cents FROM orders ORDER BY created_at DESC LIMIT 1")
    .get();
  sqlite.close();
  if (!isStoredOrder(order)) throw new Error("No order was stored");
  return order;
}

interface CheckoutCompletedEvent {
  id: string;
  object: "event";
  type: "checkout.session.completed";
  data: {
    object: {
      id: string;
      object: "checkout.session";
      client_reference_id: string;
      metadata: { order_id: string };
      payment_status: "paid";
      amount_total: number;
      currency: "usd";
    };
  };
}

export function checkoutCompletedEvent(order: StoredOrder): CheckoutCompletedEvent {
  return {
    id: `evt_${crypto.randomUUID().replaceAll("-", "")}`,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: order.stripe_session_id,
        object: "checkout.session",
        client_reference_id: order.id,
        metadata: { order_id: order.id },
        payment_status: "paid",
        amount_total: order.total_cents,
        currency: "usd",
      },
    },
  };
}

// Signs the event with the SDK's test-header helper, exactly as Stripe would sign it.
export async function deliverWebhook(request: APIRequestContext, event: object): Promise<{ outcome: string }> {
  const payload = JSON.stringify(event);
  const signature = await new Stripe(E2E_STRIPE.STRIPE_SECRET_KEY).webhooks.generateTestHeaderStringAsync({
    payload,
    secret: E2E_STRIPE.STRIPE_WEBHOOK_SECRET,
  });
  const webhookReply = await request.post("/api/stripe/webhook", {
    headers: { "content-type": "application/json", "stripe-signature": signature },
    data: payload,
  });
  expect(webhookReply.status()).toBe(200);
  const body: unknown = await webhookReply.json();
  if (typeof body !== "object" || body === null || !("outcome" in body) || typeof body.outcome !== "string") {
    throw new Error(`Webhook reply has no outcome: ${JSON.stringify(body)}`);
  }
  return { outcome: body.outcome };
}

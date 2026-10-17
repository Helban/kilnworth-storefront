import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { priceCart } from "@/lib/cart/pricing";
import type { StripeSetup } from "@/lib/payments/stripe";
import { attachStripeSession, createOrder } from "@/lib/store/orders";
import { findProductsBySlugs } from "@/lib/store/products";
import { releaseExpiredReservations, reserveStock } from "@/lib/store/reservations";
import { createTestDatabase, type TestDatabase } from "@/test/sqlite-database";
import { stripeMockSetup, TEST_WEBHOOK_SECRET } from "@/test/stripe-mock";
import { POST as receiveWebhook } from "./route";

let db: TestDatabase;
let payments: StripeSetup;
vi.mock("@/lib/db", () => ({ getDb: async () => db }));
vi.mock("@/lib/payments/env", () => ({ getStripe: async () => payments }));

const NOW = Date.now();
const ADDRESS = { name: "Ada Lovelace", line1: "12 Kiln Lane", line2: "", city: "Portland", state: "OR", postalCode: "97214" };

interface PendingOrder {
  orderId: string;
  sessionId: string;
  reservationId: string;
  totalCents: number;
}

async function placeOrder(lines: { slug: string; quantity: number }[], reservationId?: string): Promise<PendingOrder> {
  let holdId = reservationId;
  if (!holdId) {
    const hold = await reserveStock(db, lines, NOW);
    if (!hold.ok) throw new Error("expected the hold to succeed");
    holdId = hold.reservationId;
  }
  const cart = priceCart(lines, await findProductsBySlugs(db, lines.map((line) => line.slug)));
  const orderId = await createOrder(
    db,
    { reservationId: holdId, email: "ada@example.com", address: ADDRESS, cart, termsAcceptedAt: NOW },
    NOW,
  );
  const sessionId = `cs_test_${orderId.slice(0, 8)}`;
  await attachStripeSession(db, orderId, sessionId);
  return { orderId, sessionId, reservationId: holdId, totalCents: cart.totalCents };
}

function sessionEvent(type: string, order: PendingOrder, session: Record<string, unknown> = {}) {
  return {
    id: `evt_${crypto.randomUUID().replaceAll("-", "")}`,
    object: "event",
    type,
    created: Math.floor(NOW / 1000),
    data: {
      object: {
        id: order.sessionId,
        object: "checkout.session",
        client_reference_id: order.orderId,
        metadata: { order_id: order.orderId },
        payment_status: "paid",
        amount_total: order.totalCents,
        currency: "usd",
        ...session,
      },
    },
  };
}

async function signedRequest(payload: string, secret = TEST_WEBHOOK_SECRET) {
  const signature = await payments.stripe.webhooks.generateTestHeaderStringAsync({
    payload,
    secret,
    cryptoProvider: Stripe.createSubtleCryptoProvider(),
  });
  return new Request("http://shop.test/api/stripe/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": signature },
    body: payload,
  });
}

async function deliver(event: object) {
  const response = await receiveWebhook(await signedRequest(JSON.stringify(event)));
  return { status: response.status, body: (await response.json()) as { outcome?: string } };
}

function stockOf(slug: string) {
  return db.sqlite.prepare("SELECT available, reserved FROM products WHERE slug = ?").get(slug);
}

function orderStatus(orderId: string) {
  return db.sqlite.prepare("SELECT status FROM orders WHERE id = ?").get(orderId)?.status;
}

function holdStatus(reservationId: string) {
  return db.sqlite.prepare("SELECT status FROM reservations WHERE id = ?").get(reservationId)?.status;
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    db = createTestDatabase();
    payments = stripeMockSetup();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("confirms a paid order and takes the held pieces off the shelf", async () => {
    const order = await placeOrder([
      { slug: "moon-jar", quantity: 1 },
      { slug: "ash-glaze-mug", quantity: 2 },
    ]);

    const { status, body } = await deliver(sessionEvent("checkout.session.completed", order));

    expect(status).toBe(200);
    expect(body.outcome).toBe("paid");
    expect(orderStatus(order.orderId)).toBe("paid");
    expect(holdStatus(order.reservationId)).toBe("converted");
    expect(stockOf("moon-jar")).toEqual({ available: 0, reserved: 0 });
    expect(stockOf("ash-glaze-mug")).toEqual({ available: 6, reserved: 0 });
  });

  it("changes nothing when the same event is delivered a second time", async () => {
    const order = await placeOrder([{ slug: "ash-glaze-mug", quantity: 2 }]);
    const event = sessionEvent("checkout.session.completed", order);
    await deliver(event);

    const { status, body } = await deliver(event);

    expect(status).toBe(200);
    expect(body.outcome).toBe("duplicate");
    expect(stockOf("ash-glaze-mug")).toEqual({ available: 6, reserved: 0 });
    expect(db.sqlite.prepare("SELECT COUNT(*) AS count FROM stripe_events").get()?.count).toBe(1);
  });

  it("applies an event once even when five copies arrive at the same time", async () => {
    const order = await placeOrder([{ slug: "tenmoku-ramen-bowl", quantity: 2 }]);
    const event = sessionEvent("checkout.session.completed", order);

    const outcomes = await Promise.all(Array.from({ length: 5 }, () => deliver(event)));

    expect(outcomes.map(({ body }) => body.outcome).sort()).toEqual(["duplicate", "duplicate", "duplicate", "duplicate", "paid"]);
    expect(stockOf("tenmoku-ramen-bowl")).toEqual({ available: 1, reserved: 0 });
  });

  it("refuses an event signed with a different secret, and changes nothing", async () => {
    const order = await placeOrder([{ slug: "moon-jar", quantity: 1 }]);
    const payload = JSON.stringify(sessionEvent("checkout.session.completed", order));

    const response = await receiveWebhook(await signedRequest(payload, "whsec_someone_else"));

    expect(response.status).toBe(400);
    expect(orderStatus(order.orderId)).toBe("pending_payment");
    expect(stockOf("moon-jar")).toEqual({ available: 1, reserved: 1 });
  });

  it("refuses a body that was changed after signing", async () => {
    const order = await placeOrder([{ slug: "moon-jar", quantity: 1 }]);
    const signed = await signedRequest(JSON.stringify(sessionEvent("checkout.session.completed", order)));
    const tampered = JSON.stringify(sessionEvent("checkout.session.completed", order, { amount_total: 1 }));

    const response = await receiveWebhook(
      new Request(signed.url, { method: "POST", headers: signed.headers, body: tampered }),
    );

    expect(response.status).toBe(400);
    expect(orderStatus(order.orderId)).toBe("pending_payment");
  });

  it("refuses a request without a signature header", async () => {
    const response = await receiveWebhook(new Request("http://shop.test/api/stripe/webhook", { method: "POST", body: "{}" }));

    expect(response.status).toBe(400);
  });

  it("flags for review, and leaves stock alone, when a superseded order gets paid", async () => {
    const first = await placeOrder([{ slug: "moon-jar", quantity: 1 }]);
    const second = await placeOrder([{ slug: "moon-jar", quantity: 1 }], first.reservationId);

    const { body } = await deliver(sessionEvent("checkout.session.completed", first));

    expect(body.outcome).toBe("needs_review");
    expect(orderStatus(first.orderId)).toBe("needs_review");
    expect(orderStatus(second.orderId)).toBe("pending_payment");
    expect(holdStatus(first.reservationId)).toBe("active");
    expect(stockOf("moon-jar")).toEqual({ available: 1, reserved: 1 });
  });

  it("flags for review when the hold had already been released", async () => {
    const order = await placeOrder([{ slug: "moon-jar", quantity: 1 }]);
    db.sqlite.exec("UPDATE reservations SET expires_at = 0");
    await releaseExpiredReservations(db, NOW);

    const { body } = await deliver(sessionEvent("checkout.session.completed", order));

    expect(body.outcome).toBe("needs_review");
    expect(stockOf("moon-jar")).toEqual({ available: 1, reserved: 0 });
  });

  it("flags for review when Stripe charged a different amount", async () => {
    const order = await placeOrder([{ slug: "moon-jar", quantity: 1 }]);

    const { body } = await deliver(sessionEvent("checkout.session.completed", order, { amount_total: 100 }));

    expect(body.outcome).toBe("needs_review");
    expect(stockOf("moon-jar")).toEqual({ available: 1, reserved: 1 });
  });

  it("waits when the session completed but the payment has not cleared yet", async () => {
    const order = await placeOrder([{ slug: "moon-jar", quantity: 1 }]);

    const { body } = await deliver(sessionEvent("checkout.session.completed", order, { payment_status: "unpaid" }));

    expect(body.outcome).toBe("awaiting_payment");
    expect(orderStatus(order.orderId)).toBe("pending_payment");
  });

  it("releases the hold when Stripe expires the session", async () => {
    const order = await placeOrder([{ slug: "moon-jar", quantity: 1 }]);
    const event = sessionEvent("checkout.session.expired", order, { payment_status: "unpaid" });

    const { body } = await deliver(event);

    expect(body.outcome).toBe("expired");
    expect(orderStatus(order.orderId)).toBe("expired");
    expect(holdStatus(order.reservationId)).toBe("released");
    expect(stockOf("moon-jar")).toEqual({ available: 1, reserved: 0 });
    expect((await deliver(event)).body.outcome).toBe("duplicate");
  });

  it("keeps the hold when the expired session belongs to a superseded order", async () => {
    const first = await placeOrder([{ slug: "moon-jar", quantity: 1 }]);
    await placeOrder([{ slug: "moon-jar", quantity: 1 }], first.reservationId);

    const { body } = await deliver(sessionEvent("checkout.session.expired", first, { payment_status: "unpaid" }));

    expect(body.outcome).toBe("not_pending");
    expect(holdStatus(first.reservationId)).toBe("active");
    expect(stockOf("moon-jar")).toEqual({ available: 1, reserved: 1 });
  });

  it("acknowledges event types it does not act on", async () => {
    const order = await placeOrder([{ slug: "moon-jar", quantity: 1 }]);

    const { status, body } = await deliver({ ...sessionEvent("customer.created", order), data: { object: { id: "cus_1", object: "customer" } } });

    expect(status).toBe(200);
    expect(body.outcome).toBe("ignored");
  });
});

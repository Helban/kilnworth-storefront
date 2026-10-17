import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiErrorSchema, paymentBodySchema } from "@/lib/api/contract";
import type { StripeSetup } from "@/lib/payments/stripe";
import { releaseExpiredReservations, reserveStock } from "@/lib/store/reservations";
import { createCookieJar } from "@/test/cookie-jar";
import { createTestDatabase, type TestDatabase } from "@/test/sqlite-database";
import { stripeMockSetup } from "@/test/stripe-mock";
import { POST as holdCart } from "./reservation/route";
import { POST as submitCheckout } from "./route";

let db: TestDatabase;
let jar: ReturnType<typeof createCookieJar>;
let payments: StripeSetup;
vi.mock("@/lib/db", () => ({ getDbWithExpiredHoldsReleased: async () => db }));
vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("@/lib/payments/env", () => ({ getStripe: async () => payments }));

const validDetails = {
  email: "ada@example.com",
  name: "Ada Lovelace",
  line1: "12 Kiln Lane",
  line2: "",
  city: "Portland",
  state: "OR",
  postalCode: "97214",
  acceptTerms: true,
};

const sameOrigin = { host: "shop.test", origin: "http://shop.test" };

function submit(details: unknown) {
  return submitCheckout(
    new Request("http://shop.test/api/checkout", {
      method: "POST",
      headers: { ...sameOrigin, "content-type": "application/json" },
      body: JSON.stringify(details),
    }),
  );
}

function rows(sql: string) {
  return db.sqlite.prepare(sql).all();
}

describe("POST /api/checkout", () => {
  beforeEach(async () => {
    db = createTestDatabase();
    payments = stripeMockSetup();
    jar = createCookieJar();
    jar.set("cart", JSON.stringify([{ slug: "moon-jar", quantity: 1 }, { slug: "ash-glaze-mug", quantity: 2 }]));
    await holdCart(new Request("http://shop.test/api/checkout/reservation", { method: "POST", headers: sameOrigin }));
  });

  it("rejects a submission without terms acceptance with 422, before any payment call", async () => {
    const createSession = vi.spyOn(payments.stripe.checkout.sessions, "create");
    const withoutTerms: Partial<typeof validDetails> = { ...validDetails };
    delete withoutTerms.acceptTerms;

    const response = await submit(withoutTerms);

    expect(response.status).toBe(422);
    expect(apiErrorSchema.parse(await response.json()).error.fields).toEqual({
      acceptTerms: "Accept the terms of sale to continue.",
    });
    expect(createSession).not.toHaveBeenCalled();
    expect(rows("SELECT id FROM orders")).toEqual([]);
  });

  it.each([["the string \"true\"", "true"], ["\"on\"", "on"], ["1", 1], ["false", false]])(
    "does not count %s as accepting the terms",
    async (_label, acceptTerms) => {
      const response = await submit({ ...validDetails, acceptTerms });

      expect(response.status).toBe(422);
      expect(rows("SELECT id FROM orders")).toEqual([]);
    },
  );

  it("names every field that needs fixing", async () => {
    const response = await submit({ ...validDetails, email: "ada", state: "XX", postalCode: "9721" });

    expect(response.status).toBe(422);
    expect(Object.keys(apiErrorSchema.parse(await response.json()).error.fields ?? {}).sort()).toEqual([
      "email",
      "postalCode",
      "state",
    ]);
  });

  it("hands a held cart to Stripe and stores the order with the time the terms were accepted", async () => {
    const before = Date.now();

    const response = await submit(validDetails);

    expect(response.status).toBe(201);
    expect(paymentBodySchema.parse(await response.json()).payment.redirectUrl).toMatch(/^https:\/\//);
    const [order] = rows("SELECT * FROM orders");
    expect(order).toMatchObject({
      status: "pending_payment",
      email: "ada@example.com",
      shipping_postal_code: "97214",
      subtotal_cents: 34000 + 2 * 3800,
      shipping_cents: 900,
      total_cents: 34000 + 2 * 3800 + 900,
      stripe_session_id: expect.stringMatching(/^cs_/),
    });
    expect(order.terms_accepted_at).toBeGreaterThanOrEqual(before);
    expect(order.terms_accepted_at).toBeLessThanOrEqual(Date.now());
    expect(rows("SELECT product_name, unit_price_cents, quantity FROM order_lines ORDER BY product_name")).toEqual([
      { product_name: "Ash glaze mug", unit_price_cents: 3800, quantity: 2 },
      { product_name: "Moon jar", unit_price_cents: 34000, quantity: 1 },
    ]);
  });

  it("sends Stripe the server's prices and keeps the hold alive past the session's expiry", async () => {
    const createSession = vi.spyOn(payments.stripe.checkout.sessions, "create");
    const before = Date.now();

    await submit(validDetails);

    const params = createSession.mock.lastCall?.[0];
    if (!params) throw new Error("expected a Checkout Session to be created");
    expect(params.line_items?.map((item) => [item.price_data?.unit_amount, item.quantity])).toEqual([
      [34000, 1],
      [3800, 2],
    ]);
    const sessionExpiresAt = (params.expires_at ?? 0) * 1000;
    expect(sessionExpiresAt).toBeGreaterThanOrEqual(before + 29 * 60 * 1000);
    const [{ expires_at: holdExpiresAt }] = rows("SELECT expires_at FROM reservations WHERE status = 'active'");
    expect(holdExpiresAt).toBeGreaterThan(sessionExpiresAt);
  });

  it("re-checks stock before payment and refuses if the hold lapsed and someone else took the piece", async () => {
    const createSession = vi.spyOn(payments.stripe.checkout.sessions, "create");
    db.sqlite.exec("UPDATE reservations SET expires_at = 0");
    await releaseExpiredReservations(db, Date.now());
    await reserveStock(db, [{ slug: "moon-jar", quantity: 1 }], Date.now());

    const response = await submit(validDetails);

    expect(response.status).toBe(409);
    expect(apiErrorSchema.parse(await response.json()).error.code).toBe("insufficient_stock");
    expect(createSession).not.toHaveBeenCalled();
    expect(rows("SELECT id FROM orders")).toEqual([]);
  });

  it("holds the cart again if the old hold lapsed but the stock is still free", async () => {
    db.sqlite.exec("UPDATE reservations SET expires_at = 0");

    expect((await submit(validDetails)).status).toBe(201);
  });

  it("answers 502 and keeps the hold when Stripe cannot be reached", async () => {
    vi.spyOn(payments.stripe.checkout.sessions, "create").mockRejectedValue(
      new Stripe.errors.StripeConnectionError({ message: "connect ECONNREFUSED" }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await submit(validDetails);

    expect(response.status).toBe(502);
    expect(apiErrorSchema.parse(await response.json()).error.code).toBe("payment_provider_error");
    expect(rows("SELECT status FROM reservations")).toEqual([{ status: "active" }]);
    expect(rows("SELECT stripe_session_id FROM orders")).toEqual([{ stripe_session_id: null }]);
  });

  it("marks an earlier pending order as superseded when checkout is submitted again", async () => {
    await submit(validDetails);
    await submit({ ...validDetails, line2: "Studio 3" });

    expect(rows("SELECT status, shipping_line2 FROM orders ORDER BY created_at, status DESC")).toEqual([
      { status: "superseded", shipping_line2: "" },
      { status: "pending_payment", shipping_line2: "Studio 3" },
    ]);
  });
});

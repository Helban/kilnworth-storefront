import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiErrorSchema, cartBodySchema } from "@/lib/api/contract";
import { SHIPPING_CENTS } from "@/lib/cart/pricing";
import { createCookieJar, type CookieJar } from "@/test/cookie-jar";
import { createTestDatabase, type TestDatabase } from "@/test/sqlite-database";
import { POST as addLine } from "./lines/route";
import { PUT as setLine } from "./lines/[slug]/route";
import { GET as getCart } from "./route";

let db: TestDatabase;
let jar: CookieJar;
vi.mock("@/lib/db", () => ({ getDbWithExpiredHoldsReleased: () => Promise.resolve(db) }));
vi.mock("next/headers", () => ({ cookies: () => Promise.resolve(jar) }));

function jsonRequest(method: string, path: string, payload: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://shop.test${path}`, {
    method,
    headers: { "content-type": "application/json", host: "shop.test", ...headers },
    body: JSON.stringify(payload),
  });
}

function add(slug: string, quantity: number, headers?: Record<string, string>) {
  return addLine(jsonRequest("POST", "/api/cart/lines", { slug, quantity }, headers));
}

async function cartFrom(cartReply: Response) {
  return cartBodySchema.parse(await cartReply.json()).cart;
}

describe("cart routes", () => {
  beforeEach(() => {
    db = createTestDatabase();
    jar = createCookieJar();
  });

  it("adds to the cart, stores it in the cookie and returns it priced", async () => {
    await add("ash-glaze-mug", 2);
    const addReply = await add("ash-glaze-mug", 1);

    expect(addReply.status).toBe(200);
    const cart = await cartFrom(addReply);
    expect(cart.lines).toEqual([expect.objectContaining({ slug: "ash-glaze-mug", quantity: 3, lineTotalCents: 11400 })]);
    expect(JSON.parse(jar.values.get("cart") ?? "")).toEqual([{ slug: "ash-glaze-mug", quantity: 3 }]);
  });

  it("prices from the database even when the cookie claims a price", async () => {
    jar.set("cart", JSON.stringify([{ slug: "moon-jar", quantity: 1, priceCents: 1, lineTotalCents: 1 }]));

    const cart = await cartFrom(await getCart());

    expect(cart.subtotalCents).toBe(34000);
    expect(cart.totalCents).toBe(34000 + SHIPPING_CENTS);
  });

  it("follows a price change in the database on the next read", async () => {
    await add("moon-jar", 1);
    db.sqlite.exec("UPDATE products SET price_cents = 36000 WHERE slug = 'moon-jar'");

    expect((await cartFrom(await getCart())).subtotalCents).toBe(36000);
  });

  it("refuses more than is left with 409 and leaves the cookie alone", async () => {
    const stockRefusal = await add("moon-jar", 2);

    expect(stockRefusal.status).toBe(409);
    expect(await stockRefusal.json()).toEqual({ error: { code: "insufficient_stock", message: "Only 1 left." } });
    expect(jar.values.has("cart")).toBe(false);
  });

  it("counts what is already in the cart against the stock, and says so", async () => {
    await add("tenmoku-ramen-bowl", 2);

    const overStockReply = await add("tenmoku-ramen-bowl", 2);

    expect(overStockReply.status).toBe(409);
    expect(apiErrorSchema.parse(await overStockReply.json()).error.message).toBe(
      "Only 3 left, and your cart already has 2.",
    );
  });

  it("counts units held by open checkouts as unavailable", async () => {
    db.sqlite.exec("UPDATE products SET reserved = 1 WHERE slug = 'moon-jar'");

    expect((await add("moon-jar", 1)).status).toBe(409);
  });

  it("removes a line when its quantity is set to zero", async () => {
    await add("moon-jar", 1);
    await add("ash-glaze-mug", 1);

    const removeReply = await setLine(jsonRequest("PUT", "/api/cart/lines/moon-jar", { quantity: 0 }), {
      params: Promise.resolve({ slug: "moon-jar" }),
    });

    expect((await cartFrom(removeReply)).lines.map((line) => line.slug)).toEqual(["ash-glaze-mug"]);
  });

  it("refuses a request from another origin before touching the cart", async () => {
    const foreignOriginReply = await add("ash-glaze-mug", 1, { origin: "https://evil.test" });

    expect(foreignOriginReply.status).toBe(403);
    expect(jar.values.has("cart")).toBe(false);
  });

  it("accepts a request from its own origin", async () => {
    expect((await add("ash-glaze-mug", 1, { origin: "http://shop.test" })).status).toBe(200);
  });

  it("refuses a body that is not JSON, the way a cross-site form would send it", async () => {
    const formPost = new Request("http://shop.test/api/cart/lines", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "slug=ash-glaze-mug&quantity=1",
    });

    expect((await addLine(formPost)).status).toBe(415);
  });

  it("refuses a quantity outside 1 to 10 with 400", async () => {
    expect((await add("ash-glaze-mug", 0)).status).toBe(400);
    expect((await add("ash-glaze-mug", 11)).status).toBe(400);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { orderBodySchema } from "@/lib/api/contract";
import { priceCart } from "@/lib/cart/pricing";
import { createOrder } from "@/lib/store/orders";
import { findProductsBySlugs } from "@/lib/store/products";
import { reserveStock } from "@/lib/store/reservations";
import { createCookieJar, type CookieJar } from "@/test/cookie-jar";
import { createTestDatabase, type TestDatabase } from "@/test/sqlite-database";
import { GET as getOrder } from "./route";

let db: TestDatabase;
let jar: CookieJar;
vi.mock("@/lib/db", () => ({ getDb: () => Promise.resolve(db) }));
vi.mock("next/headers", () => ({ cookies: () => Promise.resolve(jar) }));

async function placeOrder(): Promise<string> {
  const lines = [{ slug: "slate-bud-vase", quantity: 2 }];
  const hold = await reserveStock(db, lines, Date.now());
  if (!hold.ok) throw new Error("expected the hold to succeed");
  const cart = priceCart(lines, await findProductsBySlugs(db, ["slate-bud-vase"]));
  const address = { name: "Ada Lovelace", line1: "12 Kiln Lane", line2: "", city: "Portland", state: "OR", postalCode: "97214" };
  return createOrder(
    db,
    { reservationId: hold.reservationId, email: "ada@example.com", address, cart, termsAcceptedAt: Date.now() },
    Date.now(),
  );
}

function read(orderId: string) {
  return getOrder(new Request(`http://shop.test/api/orders/${orderId}`), { params: Promise.resolve({ id: orderId }) });
}

describe("GET /api/orders/[id]", () => {
  beforeEach(() => {
    db = createTestDatabase();
    jar = createCookieJar();
  });

  it("shows the order to the browser that placed it", async () => {
    const orderId = await placeOrder();
    jar.set("order", orderId);

    const orderReply = await read(orderId);

    expect(orderReply.status).toBe(200);
    expect(orderBodySchema.parse(await orderReply.json()).order).toMatchObject({
      id: orderId,
      status: "pending_payment",
      lines: [{ name: "Slate bud vase", quantity: 2, unitPriceCents: 4400, lineTotalCents: 8800 }],
      totalCents: 8800 + 900,
    });
  });

  it("answers 404 to anyone else, the same as for an order that does not exist", async () => {
    const orderId = await placeOrder();
    jar.set("order", crypto.randomUUID());

    expect((await read(orderId)).status).toBe(404);
    expect((await read(crypto.randomUUID())).status).toBe(404);
    expect((await read("not-a-uuid")).status).toBe(404);
  });
});

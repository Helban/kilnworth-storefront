import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiErrorSchema, cartBodySchema, checkoutBodySchema } from "@/lib/api/contract";
import { createCookieJar, type CookieJar } from "@/test/cookie-jar";
import { createTestDatabase, type TestDatabase } from "@/test/sqlite-database";
import { GET as getCart } from "../cart/route";
import { GET as getCheckout } from "./route";
import { POST as holdCart } from "./reservation/route";

let db: TestDatabase;
let jar: CookieJar;
vi.mock("@/lib/db", () => ({ getDbWithExpiredHoldsReleased: () => Promise.resolve(db) }));
vi.mock("next/headers", () => ({ cookies: () => Promise.resolve(jar) }));

function shopperWithCart(lines: { slug: string; quantity: number }[]) {
  const shopper = createCookieJar();
  shopper.set("cart", JSON.stringify(lines));
  return shopper;
}

function postHold(origin = "http://shop.test") {
  return holdCart(new Request("http://shop.test/api/checkout/reservation", { method: "POST", headers: { host: "shop.test", origin } }));
}

function reservedOf(slug: string) {
  return db.sqlite.prepare("SELECT reserved FROM products WHERE slug = ?").get(slug)?.reserved;
}

describe("checkout hold routes", () => {
  beforeEach(() => {
    db = createTestDatabase();
  });

  it("holds the cart, remembers the hold in a cookie and reports it", async () => {
    jar = shopperWithCart([{ slug: "moon-jar", quantity: 1 }]);

    const holdReply = await postHold();

    expect(holdReply.status).toBe(200);
    const { checkout } = checkoutBodySchema.parse(await holdReply.json());
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- vitest types asymmetric matchers as any
    expect(checkout.hold).toEqual({ status: "held", expiresAt: expect.any(Number), secondsLeft: 600 });
    expect(jar.values.get("checkout")).toMatch(/^[0-9a-f-]{36}$/);
    expect(reservedOf("moon-jar")).toBe(1);
    expect(checkoutBodySchema.parse(await (await getCheckout()).json()).checkout.hold.status).toBe("held");
  });

  it("returns the same hold when asked again, without holding twice or extending it", async () => {
    jar = shopperWithCart([{ slug: "tenmoku-ramen-bowl", quantity: 2 }]);
    const first = checkoutBodySchema.parse(await (await postHold()).json()).checkout.hold;

    const second = checkoutBodySchema.parse(await (await postHold()).json()).checkout.hold;

    expect(second.status === "held" && second.expiresAt).toBe(first.status === "held" && first.expiresAt);
    expect(reservedOf("tenmoku-ramen-bowl")).toBe(2);
  });

  it("turns away a second shopper while the last unit is held, naming the piece", async () => {
    jar = shopperWithCart([{ slug: "moon-jar", quantity: 1 }]);
    await postHold();

    jar = shopperWithCart([{ slug: "moon-jar", quantity: 1 }]);
    const rejection = await postHold();

    expect(rejection.status).toBe(409);
    expect(apiErrorSchema.parse(await rejection.json()).error).toEqual({
      code: "insufficient_stock",
      message: "Not enough left of: Moon jar. Change the quantity in your cart and try again.",
    });
    expect(jar.values.has("checkout")).toBe(false);
  });

  it("swaps the hold when the cart changed after it was taken", async () => {
    jar = shopperWithCart([{ slug: "ash-glaze-mug", quantity: 1 }]);
    await postHold();

    jar.set("cart", JSON.stringify([{ slug: "ash-glaze-mug", quantity: 3 }]));
    expect(checkoutBodySchema.parse(await (await getCheckout()).json()).checkout.hold).toEqual({ status: "none" });

    await postHold();
    expect(reservedOf("ash-glaze-mug")).toBe(3);
  });

  it("does not show the holder their own held piece as sold out", async () => {
    jar = shopperWithCart([{ slug: "moon-jar", quantity: 1 }]);
    await postHold();

    const { cart } = cartBodySchema.parse(await (await getCart()).json());

    expect(cart.lines[0].stockLeft).toBe(1);
    expect(cart.exceedsStock).toBe(false);
  });

  it("refuses to hold an empty cart", async () => {
    jar = createCookieJar();

    const emptyCartReply = await postHold();

    expect(emptyCartReply.status).toBe(409);
    expect(apiErrorSchema.parse(await emptyCartReply.json()).error.code).toBe("cart_empty");
  });

  it("refuses a hold requested from another origin", async () => {
    jar = shopperWithCart([{ slug: "moon-jar", quantity: 1 }]);

    expect((await postHold("https://evil.test")).status).toBe(403);
    expect(reservedOf("moon-jar")).toBe(0);
  });
});

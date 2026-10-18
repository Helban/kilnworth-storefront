import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCookieJar, type CookieJar } from "@/test/cookie-jar";
import { GET as completeCheckout } from "./route";

let jar: CookieJar;
vi.mock("next/headers", () => ({ cookies: () => Promise.resolve(jar) }));

const ORDER_ID = "4f0c2a8e-5d1b-4c3e-9a77-1b2c3d4e5f60";

function arriveFromStripe() {
  return completeCheckout(new NextRequest(`http://shop.test/checkout/complete?order=${ORDER_ID}`));
}

describe("GET /checkout/complete", () => {
  beforeEach(() => {
    jar = createCookieJar();
    jar.set("cart", JSON.stringify([{ slug: "slate-bud-vase", quantity: 2 }]));
    jar.set("checkout", "6a1d7c55-0f6e-4b0e-8a3c-2d9e1f0b7c44");
  });

  it("clears the cart and hold of the shopper who placed the order, then shows the order", async () => {
    jar.set("order", ORDER_ID);

    const completionReply = await arriveFromStripe();

    expect(completionReply.status).toBe(303);
    expect(completionReply.headers.get("location")).toBe(`http://shop.test/orders/${ORDER_ID}`);
    expect([...jar.values.keys()]).toEqual(["order"]);
  });

  it("leaves the cart alone for anyone else", async () => {
    await arriveFromStripe();

    expect(jar.values.has("cart")).toBe(true);
    expect(jar.values.has("checkout")).toBe(true);
  });
});

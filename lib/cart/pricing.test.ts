import { describe, expect, it } from "vitest";
import type { ProductRecord } from "@/lib/store/products";
import { priceCart, SHIPPING_CENTS } from "./pricing";

const mug: ProductRecord = {
  slug: "ash-glaze-mug",
  name: "Ash glaze mug",
  description: "",
  category: "mug",
  priceCents: 3800,
  stockLeft: 8,
};
const jar: ProductRecord = { ...mug, slug: "moon-jar", name: "Moon jar", category: "one-off", priceCents: 34000, stockLeft: 1 };

describe("priceCart", () => {
  it("prices each line from the product record and adds flat shipping", () => {
    const cart = priceCart(
      [
        { slug: "ash-glaze-mug", quantity: 3 },
        { slug: "moon-jar", quantity: 1 },
      ],
      [mug, jar],
    );

    expect(cart.lines.map((line) => line.lineTotalCents)).toEqual([11400, 34000]);
    expect(cart.itemCount).toBe(4);
    expect(cart.subtotalCents).toBe(45400);
    expect(cart.shippingCents).toBe(SHIPPING_CENTS);
    expect(cart.totalCents).toBe(45400 + SHIPPING_CENTS);
  });

  it("charges no shipping on an empty cart", () => {
    expect(priceCart([], [])).toMatchObject({ subtotalCents: 0, shippingCents: 0, totalCents: 0 });
  });

  it("drops lines whose product is no longer in the catalog", () => {
    const cart = priceCart(
      [
        { slug: "retired-teapot", quantity: 2 },
        { slug: "ash-glaze-mug", quantity: 1 },
      ],
      [mug],
    );

    expect(cart.lines.map((line) => line.product.slug)).toEqual(["ash-glaze-mug"]);
    expect(cart.totalCents).toBe(3800 + SHIPPING_CENTS);
  });

  it("flags a cart that asks for more than is left", () => {
    expect(priceCart([{ slug: "moon-jar", quantity: 1 }], [jar]).exceedsStock).toBe(false);
    expect(priceCart([{ slug: "moon-jar", quantity: 2 }], [jar]).exceedsStock).toBe(true);
  });
});

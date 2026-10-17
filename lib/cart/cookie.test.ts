import { describe, expect, it } from "vitest";
import { parseCartCookie, serializeCart, setLineQuantity } from "./cookie";

describe("parseCartCookie", () => {
  it("reads back what serializeCart wrote", () => {
    const lines = [
      { slug: "moon-jar", quantity: 1 },
      { slug: "ash-glaze-mug", quantity: 4 },
    ];

    expect(parseCartCookie(serializeCart(lines))).toEqual(lines);
  });

  it("drops any price a client slipped into the cookie", () => {
    const tampered = JSON.stringify([{ slug: "moon-jar", quantity: 1, priceCents: 1 }]);

    expect(parseCartCookie(tampered)).toEqual([{ slug: "moon-jar", quantity: 1 }]);
  });

  it.each([
    ["not JSON", "%%%"],
    ["not an array", JSON.stringify({ slug: "moon-jar", quantity: 1 })],
    ["a zero quantity", JSON.stringify([{ slug: "moon-jar", quantity: 0 }])],
    ["a fractional quantity", JSON.stringify([{ slug: "moon-jar", quantity: 1.5 }])],
    ["a quantity over the limit", JSON.stringify([{ slug: "moon-jar", quantity: 11 }])],
    ["a slug outside the allowed format", JSON.stringify([{ slug: "../etc", quantity: 1 }])],
  ])("treats a cookie with %s as an empty cart", (_case, raw) => {
    expect(parseCartCookie(raw)).toEqual([]);
  });
});

describe("setLineQuantity", () => {
  const lines = [
    { slug: "a", quantity: 1 },
    { slug: "b", quantity: 2 },
    { slug: "c", quantity: 3 },
  ];

  it("changes a line in place, keeping the order", () => {
    expect(setLineQuantity(lines, "b", 5).map((line) => `${line.slug}${line.quantity}`)).toEqual(["a1", "b5", "c3"]);
  });

  it("appends a new product and removes a line set to zero", () => {
    expect(setLineQuantity(lines, "d", 1).map((line) => line.slug)).toEqual(["a", "b", "c", "d"]);
    expect(setLineQuantity(lines, "a", 0).map((line) => line.slug)).toEqual(["b", "c"]);
  });
});

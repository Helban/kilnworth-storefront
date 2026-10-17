import { describe, expect, it } from "vitest";
import { createTestDatabase } from "@/test/sqlite-database";
import { findProductBySlug, listProducts } from "./products";

describe("product queries", () => {
  it("lists the seeded catalog in display order", async () => {
    const products = await listProducts(createTestDatabase());

    expect(products).toHaveLength(13);
    expect(products[0]).toEqual({
      slug: "ash-glaze-mug",
      name: "Ash glaze mug",
      description: expect.any(String),
      category: "mug",
      priceCents: 3800,
      stockLeft: 8,
    });
  });

  it("subtracts units held by open checkouts from the stock left", async () => {
    const db = createTestDatabase();
    db.sqlite.exec("UPDATE products SET reserved = 3 WHERE slug = 'iron-speckle-mug'");

    expect((await findProductBySlug(db, "iron-speckle-mug"))?.stockLeft).toBe(3);
  });

  it("returns null for a slug that does not exist", async () => {
    expect(await findProductBySlug(createTestDatabase(), "no-such-pot")).toBeNull();
  });
});

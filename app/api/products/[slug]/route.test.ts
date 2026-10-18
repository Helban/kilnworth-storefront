import { beforeEach, describe, expect, it, vi } from "vitest";
import { productDetailSchema } from "@/lib/api/contract";
import type { SqlDatabase } from "@/lib/store/database";
import { createTestDatabase } from "@/test/sqlite-database";
import { GET } from "./route";

let db: SqlDatabase;
vi.mock("@/lib/db", () => ({ getDbWithExpiredHoldsReleased: () => Promise.resolve(db) }));

function getProduct(slug: string) {
  return GET(new Request(`http://test/api/products/${slug}`), { params: Promise.resolve({ slug }) });
}

describe("GET /api/products/[slug]", () => {
  beforeEach(() => {
    db = createTestDatabase();
  });

  it("returns a body that satisfies the published contract", async () => {
    const productReply = await getProduct("moon-jar");

    expect(productReply.status).toBe(200);
    expect(productDetailSchema.parse(await productReply.json()).product).toMatchObject({
      name: "Moon jar",
      stockLeft: 1,
      image: { src: "/products/moon-jar.webp" },
    });
  });

  it("answers 404 with an error code for an unknown slug", async () => {
    const missingReply = await getProduct("teapot");

    expect(missingReply.status).toBe(404);
    expect(await missingReply.json()).toEqual({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- vitest types asymmetric matchers as any
      error: { code: "product_not_found", message: expect.any(String) },
    });
  });

  it("answers 404 without querying for a slug outside the allowed format", async () => {
    const prepare = vi.spyOn(db, "prepare");

    expect((await getProduct("moon-jar' OR 1=1 --")).status).toBe(404);
    expect(prepare).not.toHaveBeenCalled();
  });
});

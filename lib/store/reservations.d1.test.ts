import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SqlDatabase } from "@/lib/store/database";
import { createLocalD1 } from "@/test/local-d1";
import { findProductBySlug } from "./products";
import { releaseExpiredReservations, RESERVATION_TTL_MS, reserveStock } from "./reservations";

// The same race as reservations.test.ts, against workerd's D1 instead of node:sqlite. It guards
// against the SQL (in particular changes() inside a batch) behaving differently on D1.
describe("reserveStock on local D1", () => {
  let db: SqlDatabase;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    ({ db, dispose } = await createLocalD1());
  }, 60_000);

  afterAll(async () => {
    await dispose();
  });

  it("lets exactly one of ten concurrent buyers hold the last unit, then frees it on expiry", async () => {
    const now = Date.now();
    const outcomes = await Promise.all(
      Array.from({ length: 10 }, () => reserveStock(db, [{ slug: "moon-jar", quantity: 1 }], now)),
    );

    expect(outcomes.filter((outcome) => outcome.ok)).toHaveLength(1);
    expect((await findProductBySlug(db, "moon-jar"))?.stockLeft).toBe(0);

    await releaseExpiredReservations(db, now + RESERVATION_TTL_MS);
    expect((await findProductBySlug(db, "moon-jar"))?.stockLeft).toBe(1);
  });

  it("holds nothing when one line of several is short", async () => {
    const outcome = await reserveStock(
      db,
      [
        { slug: "ash-glaze-mug", quantity: 2 },
        { slug: "ripple-platter", quantity: 2 },
      ],
      Date.now(),
    );

    expect(outcome).toEqual({ ok: false, shortSlugs: ["ripple-platter"] });
    expect((await findProductBySlug(db, "ash-glaze-mug"))?.stockLeft).toBe(8);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase, type TestDatabase } from "@/test/sqlite-database";
import {
  findActiveReservation,
  releaseExpiredReservations,
  releaseReservation,
  RESERVATION_TTL_MS,
  reserveStock,
} from "./reservations";

const NOW = Date.UTC(2026, 9, 17, 12, 0, 0);

let db: TestDatabase;

function stockOf(slug: string) {
  return db.sqlite.prepare("SELECT available, reserved FROM products WHERE slug = ?").get(slug);
}

function statusOf(reservationId: string) {
  return db.sqlite.prepare("SELECT status FROM reservations WHERE id = ?").get(reservationId)?.status;
}

describe("reserveStock", () => {
  beforeEach(() => {
    db = createTestDatabase();
  });

  it("holds every line for ten minutes and records what it holds", async () => {
    const outcome = await reserveStock(
      db,
      [
        { slug: "ash-glaze-mug", quantity: 2 },
        { slug: "moon-jar", quantity: 1 },
      ],
      NOW,
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- vitest types asymmetric matchers as any
    expect(outcome).toEqual({ ok: true, reservationId: expect.any(String), expiresAt: NOW + RESERVATION_TTL_MS });
    expect(stockOf("ash-glaze-mug")).toEqual({ available: 8, reserved: 2 });
    expect(stockOf("moon-jar")).toEqual({ available: 1, reserved: 1 });
    if (!outcome.ok) return;
    expect(await findActiveReservation(db, outcome.reservationId, NOW)).toEqual({
      id: outcome.reservationId,
      expiresAt: NOW + RESERVATION_TTL_MS,
      lines: [
        { slug: "ash-glaze-mug", quantity: 2 },
        { slug: "moon-jar", quantity: 1 },
      ],
    });
  });

  it("lets exactly one of ten concurrent buyers hold the last unit", async () => {
    const outcomes = await Promise.all(
      Array.from({ length: 10 }, () => reserveStock(db, [{ slug: "moon-jar", quantity: 1 }], NOW)),
    );

    expect(outcomes.filter((outcome) => outcome.ok)).toHaveLength(1);
    expect(outcomes.filter((outcome) => !outcome.ok)).toEqual(
      Array.from({ length: 9 }, () => ({ ok: false, shortSlugs: ["moon-jar"] })),
    );
    expect(stockOf("moon-jar")).toEqual({ available: 1, reserved: 1 });
    expect(db.sqlite.prepare("SELECT COUNT(*) AS count FROM reservation_lines").get()?.count).toBe(1);
  });

  it("holds nothing when one line is short, and names the short line", async () => {
    const outcome = await reserveStock(
      db,
      [
        { slug: "ash-glaze-mug", quantity: 2 },
        { slug: "moon-jar", quantity: 2 },
      ],
      NOW,
    );

    expect(outcome).toEqual({ ok: false, shortSlugs: ["moon-jar"] });
    expect(stockOf("ash-glaze-mug")).toEqual({ available: 8, reserved: 0 });
    expect(stockOf("moon-jar")).toEqual({ available: 1, reserved: 0 });
  });

  it("counts other open holds as taken", async () => {
    await reserveStock(db, [{ slug: "nesting-bowls", quantity: 2 }], NOW);

    expect(await reserveStock(db, [{ slug: "nesting-bowls", quantity: 1 }], NOW)).toEqual({
      ok: false,
      shortSlugs: ["nesting-bowls"],
    });
  });
});

describe("releasing holds", () => {
  beforeEach(() => {
    db = createTestDatabase();
  });

  it("gives the stock back once, however often release is called", async () => {
    const outcome = await reserveStock(db, [{ slug: "tenmoku-ramen-bowl", quantity: 2 }], NOW);
    if (!outcome.ok) throw new Error("expected the hold to succeed");

    await releaseReservation(db, outcome.reservationId);
    await releaseReservation(db, outcome.reservationId);

    expect(stockOf("tenmoku-ramen-bowl")).toEqual({ available: 3, reserved: 0 });
    expect(statusOf(outcome.reservationId)).toBe("released");
  });

  it("releases holds whose time is up and keeps the rest", async () => {
    const early = await reserveStock(db, [{ slug: "moon-jar", quantity: 1 }], NOW);
    const later = await reserveStock(db, [{ slug: "ripple-platter", quantity: 1 }], NOW + 60_000);
    if (!early.ok || !later.ok) throw new Error("expected both holds to succeed");

    await releaseExpiredReservations(db, NOW + RESERVATION_TTL_MS);

    expect(statusOf(early.reservationId)).toBe("released");
    expect(stockOf("moon-jar")).toEqual({ available: 1, reserved: 0 });
    expect(statusOf(later.reservationId)).toBe("active");
    expect(stockOf("ripple-platter")).toEqual({ available: 1, reserved: 1 });
  });

  it("lets the next buyer have a piece once the first hold has expired", async () => {
    await reserveStock(db, [{ slug: "moon-jar", quantity: 1 }], NOW);
    const afterExpiry = NOW + RESERVATION_TTL_MS;

    await releaseExpiredReservations(db, afterExpiry);

    expect((await reserveStock(db, [{ slug: "moon-jar", quantity: 1 }], afterExpiry)).ok).toBe(true);
  });

  it("does not report an expired hold as active, even before the sweep has run", async () => {
    const outcome = await reserveStock(db, [{ slug: "moon-jar", quantity: 1 }], NOW);
    if (!outcome.ok) throw new Error("expected the hold to succeed");

    expect(await findActiveReservation(db, outcome.reservationId, NOW + RESERVATION_TTL_MS)).toBeNull();
  });
});

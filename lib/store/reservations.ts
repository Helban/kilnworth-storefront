import type { CartLine } from "@/lib/cart/cookie";
import type { SqlDatabase } from "./database";

export const RESERVATION_TTL_MS = 10 * 60 * 1000;

export type ReserveOutcome =
  | { ok: true; reservationId: string; expiresAt: number }
  | { ok: false; shortSlugs: string[] };

export interface ActiveReservation {
  readonly id: string;
  readonly expiresAt: number;
  readonly lines: CartLine[];
}

// Holds stock for every line, or for none. Each line is one conditional UPDATE: the WHERE clause
// re-checks the free stock inside the write itself, so two buyers racing for the last unit cannot
// both get it. The line row that records the hold is inserted in the same transaction, and only if
// that UPDATE changed a row (SQLite's changes()). If any line comes up short, the lines that did
// succeed are released straight away.
export async function reserveStock(
  db: SqlDatabase,
  lines: readonly CartLine[],
  now: number,
): Promise<ReserveOutcome> {
  const reservationId = crypto.randomUUID();
  const expiresAt = now + RESERVATION_TTL_MS;
  const results = await db.batch([
    db
      .prepare("INSERT INTO reservations (id, status, created_at, expires_at) VALUES (?1, 'active', ?2, ?3)")
      .bind(reservationId, now, expiresAt),
    ...lines.flatMap((line) => [
      db
        .prepare("UPDATE products SET reserved = reserved + ?1 WHERE slug = ?2 AND available - reserved >= ?1")
        .bind(line.quantity, line.slug),
      db
        .prepare(
          `INSERT INTO reservation_lines (reservation_id, product_id, quantity)
           SELECT ?1, id, ?2 FROM products WHERE slug = ?3 AND changes() = 1`,
        )
        .bind(reservationId, line.quantity, line.slug),
    ]),
  ]);

  // results[0] is the reservation row; each line then has its UPDATE followed by its INSERT.
  const shortSlugs = lines
    .filter((_, index) => results[1 + index * 2].meta.changes === 0)
    .map((line) => line.slug);
  if (shortSlugs.length === 0) return { ok: true, reservationId, expiresAt };

  await releaseReservation(db, reservationId);
  return { ok: false, shortSlugs };
}

export async function findActiveReservation(
  db: SqlDatabase,
  reservationId: string,
  now: number,
): Promise<ActiveReservation | null> {
  const reservation = await db
    .prepare("SELECT id, expires_at AS expiresAt FROM reservations WHERE id = ?1 AND status = 'active' AND expires_at > ?2")
    .bind(reservationId, now)
    .first<{ id: string; expiresAt: number }>();
  if (!reservation) return null;

  const { results: lines } = await db
    .prepare(
      `SELECT p.slug AS slug, l.quantity AS quantity
       FROM reservation_lines l JOIN products p ON p.id = l.product_id
       WHERE l.reservation_id = ?1 ORDER BY p.slug`,
    )
    .bind(reservationId)
    .all<CartLine>();
  return { ...reservation, lines };
}

// Safe to call more than once: only an active hold is released.
export async function releaseReservation(db: SqlDatabase, reservationId: string): Promise<void> {
  await releaseHolds(db, "r.id = ?1", reservationId);
}

// Lazy expiry: called before anything reads or changes stock (see getDbWithExpiredHoldsReleased).
export async function releaseExpiredReservations(db: SqlDatabase, now: number): Promise<void> {
  await releaseHolds(db, "r.expires_at <= ?1", now);
}

// `matching` is one of the two fixed conditions above, never caller input. Both statements run in
// one transaction, and the stock is given back before the status flips, so a hold is returned once.
async function releaseHolds(
  db: SqlDatabase,
  matching: "r.id = ?1" | "r.expires_at <= ?1",
  value: string | number,
): Promise<void> {
  const heldLines = `
    FROM reservation_lines l JOIN reservations r ON r.id = l.reservation_id
    WHERE r.status = 'active' AND ${matching}`;
  await db.batch([
    db
      .prepare(
        `UPDATE products
         SET reserved = reserved - (SELECT SUM(l.quantity) ${heldLines} AND l.product_id = products.id)
         WHERE id IN (SELECT l.product_id ${heldLines})`,
      )
      .bind(value),
    db
      .prepare(`UPDATE reservations SET status = 'released' WHERE id IN (SELECT r.id FROM reservations r WHERE r.status = 'active' AND ${matching})`)
      .bind(value),
  ]);
}

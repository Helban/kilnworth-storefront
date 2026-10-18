import "server-only";
import { cookies } from "next/headers";
import type { Hold } from "@/lib/api/contract";
import type { SqlDatabase } from "@/lib/store/database";
import {
  findActiveReservation,
  releaseReservation,
  reserveStock,
  type ActiveReservation,
  type ReserveOutcome,
} from "@/lib/store/reservations";
import { cookieOptions, type CartLine } from "./cookie";

// The id of this shopper's current reservation. It is a random UUID, so it doubles as proof that
// the hold belongs to whoever holds the cookie.
export const CHECKOUT_COOKIE = "checkout";
const CHECKOUT_COOKIE_OPTIONS = cookieOptions(60 * 60);

export async function readHeldReservationId(): Promise<string | undefined> {
  return (await cookies()).get(CHECKOUT_COOKIE)?.value;
}

async function rememberReservation(reservationId: string): Promise<void> {
  (await cookies()).set(CHECKOUT_COOKIE, reservationId, CHECKOUT_COOKIE_OPTIONS);
}

// What this shopper's own active hold covers, by slug. Empty when they hold nothing.
export async function readOwnHeldQuantities(db: SqlDatabase, now: number): Promise<Map<string, number>> {
  const reservationId = await readHeldReservationId();
  const reservation = reservationId ? await findActiveReservation(db, reservationId, now) : null;
  return new Map(reservation?.lines.map((line) => [line.slug, line.quantity]));
}

// "held" only when an unexpired reservation covers exactly the lines in the cart right now.
export async function describeHold(db: SqlDatabase, lines: readonly CartLine[], now: number): Promise<Hold> {
  const reservation = await findCoveringReservation(db, lines, now);
  return reservation ? heldUntil(reservation.expiresAt, now) : { status: "none" };
}

// Keeps the shopper's hold if it still covers the cart. Otherwise releases it and holds the cart
// afresh, which is also the stock re-check right before payment.
export async function ensureHold(db: SqlDatabase, lines: readonly CartLine[], now: number): Promise<ReserveOutcome> {
  const covering = await findCoveringReservation(db, lines, now);
  if (covering) return { ok: true, reservationId: covering.id, expiresAt: covering.expiresAt };

  const previousId = await readHeldReservationId();
  if (previousId) await releaseReservation(db, previousId);
  const outcome = await reserveStock(db, lines, now);
  if (outcome.ok) await rememberReservation(outcome.reservationId);
  return outcome;
}

async function findCoveringReservation(
  db: SqlDatabase,
  lines: readonly CartLine[],
  now: number,
): Promise<ActiveReservation | null> {
  const reservationId = await readHeldReservationId();
  const reservation = reservationId ? await findActiveReservation(db, reservationId, now) : null;
  return reservation && sameLines(reservation.lines, lines) ? reservation : null;
}

export function heldUntil(expiresAt: number, now: number): Hold {
  return { status: "held", expiresAt, secondsLeft: Math.max(0, Math.floor((expiresAt - now) / 1000)) };
}

function sameLines(held: readonly CartLine[], wanted: readonly CartLine[]): boolean {
  const key = (lines: readonly CartLine[]) =>
    lines.map((line) => `${line.slug}:${line.quantity}`).sort().join(",");
  return key(held) === key(wanted);
}

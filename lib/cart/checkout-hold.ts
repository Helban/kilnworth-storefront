import "server-only";
import { cookies } from "next/headers";
import type { Hold } from "@/lib/api/contract";
import type { SqlDatabase } from "@/lib/store/database";
import { findActiveReservation } from "@/lib/store/reservations";
import type { CartLine } from "./cookie";

// The id of this shopper's current reservation. It is a random UUID, so it doubles as proof that
// the hold belongs to whoever holds the cookie.
const CHECKOUT_COOKIE = "checkout";
const CHECKOUT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60,
} as const;

export async function readHeldReservationId(): Promise<string | undefined> {
  return (await cookies()).get(CHECKOUT_COOKIE)?.value;
}

export async function rememberReservation(reservationId: string): Promise<void> {
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
  const reservationId = await readHeldReservationId();
  const reservation = reservationId ? await findActiveReservation(db, reservationId, now) : null;
  if (!reservation || !sameLines(reservation.lines, lines)) return { status: "none" };
  return heldUntil(reservation.expiresAt, now);
}

export function heldUntil(expiresAt: number, now: number): Hold {
  return { status: "held", expiresAt, secondsLeft: Math.max(0, Math.floor((expiresAt - now) / 1000)) };
}

function sameLines(held: readonly CartLine[], wanted: readonly CartLine[]): boolean {
  const key = (lines: readonly CartLine[]) =>
    lines.map((line) => `${line.slug}:${line.quantity}`).sort().join(",");
  return key(held) === key(wanted);
}

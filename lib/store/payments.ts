import type { SqlDatabase, SqlRunResult, SqlStatement } from "./database";
import { HOLD_OF_PENDING_ORDER, releaseHoldStatements } from "./reservations";

export interface StripeEventRef {
  readonly eventId: string;
  readonly eventType: string;
  readonly orderId: string;
}

export interface PaidCheckout extends StripeEventRef {
  readonly sessionId: string;
  readonly amountTotal: number;
  readonly currency: string;
}

export type PaidOutcome = "paid" | "needs_review" | "duplicate" | "unknown_order";
export type ExpiredOutcome = "expired" | "not_pending" | "duplicate" | "unknown_order";

// The order's hold, but only while everything about the payment lines up: the order is still the
// pending one for its hold, the hold is still active, and Stripe's session and amount are the ones
// this order was created with. ?1 order id, ?2 session id, ?3 amount in cents, ?4 currency.
const PAYABLE_HOLD = `
  SELECT o.reservation_id FROM orders o JOIN reservations r ON r.id = o.reservation_id
  WHERE o.id = ?1 AND o.status = 'pending_payment' AND r.status = 'active'
    AND o.stripe_session_id = ?2 AND o.total_cents = ?3 AND ?4 = 'usd'`;

// Records a completed payment exactly once. When the payment lines up, the held units come off the
// shelf, the hold becomes "converted" and the order "paid". Anything else (a superseded order paid
// from a second tab, a hold that already lapsed, a different amount) marks the order needs_review
// and leaves stock alone, because money was taken and a person has to decide what happens next.
export async function recordPaidCheckout(db: SqlDatabase, payment: PaidCheckout, now: number): Promise<PaidOutcome> {
  if (await eventSeen(db, payment.eventId)) return "duplicate";
  if (!(await orderExists(db, payment.orderId))) return "unknown_order";

  const payable = [payment.orderId, payment.sessionId, payment.amountTotal, payment.currency] as const;
  const applied = await applyOnce(db, payment.eventId, [
    insertEvent(db, payment, now),
    db
      .prepare(
        `UPDATE products
         SET available = available - (SELECT l.quantity FROM reservation_lines l
                                      WHERE l.reservation_id = (${PAYABLE_HOLD}) AND l.product_id = products.id),
             reserved = reserved - (SELECT l.quantity FROM reservation_lines l
                                    WHERE l.reservation_id = (${PAYABLE_HOLD}) AND l.product_id = products.id)
         WHERE id IN (SELECT l.product_id FROM reservation_lines l WHERE l.reservation_id = (${PAYABLE_HOLD}))`,
      )
      .bind(...payable),
    db.prepare(`UPDATE reservations SET status = 'converted' WHERE id = (${PAYABLE_HOLD})`).bind(...payable),
    db
      .prepare(
        `UPDATE orders
         SET status = CASE
               WHEN status = 'pending_payment'
                AND (SELECT r.status FROM reservations r WHERE r.id = orders.reservation_id) = 'converted'
               THEN 'paid' ELSE 'needs_review' END,
             paid_at = ?2
         WHERE id = ?1 AND status IN ('pending_payment', 'superseded', 'expired')`,
      )
      .bind(payment.orderId, now),
  ]);
  if (!applied) return "duplicate";

  const order = await db
    .prepare("SELECT status FROM orders WHERE id = ?1")
    .bind(payment.orderId)
    .first<{ status: string }>();
  return order?.status === "paid" ? "paid" : "needs_review";
}

// Stripe gave up on the session. Releases the hold, but only if this order is still the pending
// one for it: a superseded order's session expiring must not free stock the newer order relies on.
export async function recordExpiredCheckout(db: SqlDatabase, expiry: StripeEventRef, now: number): Promise<ExpiredOutcome> {
  if (await eventSeen(db, expiry.eventId)) return "duplicate";
  if (!(await orderExists(db, expiry.orderId))) return "unknown_order";

  const applied = await applyOnce(db, expiry.eventId, [
    insertEvent(db, expiry, now),
    ...releaseHoldStatements(db, HOLD_OF_PENDING_ORDER, expiry.orderId),
    db.prepare("UPDATE orders SET status = 'expired' WHERE id = ?1 AND status = 'pending_payment'").bind(expiry.orderId),
  ]);
  if (!applied) return "duplicate";
  return applied[applied.length - 1].meta.changes === 1 ? "expired" : "not_pending";
}

function insertEvent(db: SqlDatabase, event: StripeEventRef, now: number) {
  // A plain INSERT on purpose: a repeat delivery must fail here and take the batch down with it.
  return db
    .prepare("INSERT INTO stripe_events (id, type, order_id, received_at) VALUES (?1, ?2, ?3, ?4)")
    .bind(event.eventId, event.eventType, event.orderId, now);
}

// Runs the event's batch. Null when it failed because a concurrent delivery of the same event got
// there first; the batch is a transaction, so none of it was applied. Other failures are rethrown.
async function applyOnce(db: SqlDatabase, eventId: string, statements: SqlStatement[]): Promise<SqlRunResult[] | null> {
  try {
    return await db.batch(statements);
  } catch (error) {
    if (await eventSeen(db, eventId)) return null;
    throw error;
  }
}

async function eventSeen(db: SqlDatabase, eventId: string): Promise<boolean> {
  return (await db.prepare("SELECT 1 AS seen FROM stripe_events WHERE id = ?1").bind(eventId).first()) !== null;
}

async function orderExists(db: SqlDatabase, orderId: string): Promise<boolean> {
  return (await db.prepare("SELECT 1 AS found FROM orders WHERE id = ?1").bind(orderId).first()) !== null;
}

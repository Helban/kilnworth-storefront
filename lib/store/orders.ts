import type { PricedCart } from "@/lib/cart/pricing";
import type { SqlDatabase } from "./database";

export interface ShippingAddress {
  readonly name: string;
  readonly line1: string;
  readonly line2: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
}

export interface NewOrder {
  readonly reservationId: string;
  readonly email: string;
  readonly address: ShippingAddress;
  readonly cart: PricedCart;
  readonly termsAcceptedAt: number;
}

// Creates a pending order for a held cart. An earlier pending order for the same hold (the shopper
// came back from Stripe and submitted again) is marked superseded in the same transaction.
export async function createOrder(db: SqlDatabase, order: NewOrder, now: number): Promise<string> {
  const orderId = crypto.randomUUID();
  const { address, cart } = order;
  await db.batch([
    db
      .prepare("UPDATE orders SET status = 'superseded' WHERE reservation_id = ?1 AND status = 'pending_payment'")
      .bind(order.reservationId),
    db
      .prepare(
        `INSERT INTO orders (
           id, reservation_id, status, email,
           shipping_name, shipping_line1, shipping_line2, shipping_city, shipping_state,
           shipping_postal_code, shipping_country,
           subtotal_cents, shipping_cents, total_cents, terms_accepted_at, created_at
         ) VALUES (?1, ?2, 'pending_payment', ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'US', ?10, ?11, ?12, ?13, ?14)`,
      )
      .bind(
        orderId,
        order.reservationId,
        order.email,
        address.name,
        address.line1,
        address.line2,
        address.city,
        address.state,
        address.postalCode,
        cart.subtotalCents,
        cart.shippingCents,
        cart.totalCents,
        order.termsAcceptedAt,
        now,
      ),
    ...cart.lines.map((line) =>
      db
        .prepare(
          `INSERT INTO order_lines (order_id, product_id, product_name, unit_price_cents, quantity)
           SELECT ?1, id, ?2, ?3, ?4 FROM products WHERE slug = ?5`,
        )
        .bind(orderId, line.product.name, line.product.priceCents, line.quantity, line.product.slug),
    ),
  ]);
  return orderId;
}

export async function attachStripeSession(db: SqlDatabase, orderId: string, sessionId: string): Promise<void> {
  await db.prepare("UPDATE orders SET stripe_session_id = ?1 WHERE id = ?2").bind(sessionId, orderId).run();
}

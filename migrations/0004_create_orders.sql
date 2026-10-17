-- One row per checkout submission. Prices and names are copied from products at that moment, so a
-- later price change never alters an order. Times are Unix milliseconds.
--
-- status:
--   pending_payment  handed to Stripe, waiting for checkout.session.completed
--   paid             payment confirmed by the webhook, reserved stock taken off the shelf
--   expired          the Stripe session ran out unpaid; the hold was released
--   superseded       the shopper submitted checkout again; a newer order replaced this one
--   needs_review     paid, but its hold was no longer active; a person has to check stock or refund
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  reservation_id TEXT NOT NULL REFERENCES reservations (id),
  status TEXT NOT NULL CHECK (status IN ('pending_payment', 'paid', 'expired', 'superseded', 'needs_review')),
  email TEXT NOT NULL,
  shipping_name TEXT NOT NULL,
  shipping_line1 TEXT NOT NULL,
  shipping_line2 TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_state TEXT NOT NULL,
  shipping_postal_code TEXT NOT NULL,
  shipping_country TEXT NOT NULL CHECK (shipping_country = 'US'),
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents > 0),
  shipping_cents INTEGER NOT NULL CHECK (shipping_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents = subtotal_cents + shipping_cents),
  terms_accepted_at INTEGER NOT NULL,
  stripe_session_id TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);

CREATE INDEX orders_by_reservation ON orders (reservation_id, status);

CREATE TABLE order_lines (
  order_id TEXT NOT NULL REFERENCES orders (id),
  product_id INTEGER NOT NULL REFERENCES products (id),
  product_name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents > 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (order_id, product_id)
);

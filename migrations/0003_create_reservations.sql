-- A hold on stock for one checkout. While a hold is active, its lines count in products.reserved.
-- Times are Unix milliseconds.
CREATE TABLE reservations (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('active', 'released', 'converted')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX reservations_by_status_and_expiry ON reservations (status, expires_at);

-- Written in the same transaction as the products.reserved increment it records, and only when
-- that increment happened. Releasing a hold subtracts exactly these quantities.
CREATE TABLE reservation_lines (
  reservation_id TEXT NOT NULL REFERENCES reservations (id),
  product_id INTEGER NOT NULL REFERENCES products (id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (reservation_id, product_id)
);

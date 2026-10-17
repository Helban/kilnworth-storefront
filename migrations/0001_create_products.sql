-- available: units on the shelf that have not been sold.
-- reserved:  units held by open checkouts. Free to reserve = available - reserved.
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('mug', 'bowl', 'vase', 'one-off')),
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  available INTEGER NOT NULL CHECK (available >= 0),
  reserved INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0 AND reserved <= available),
  sort_order INTEGER NOT NULL
);

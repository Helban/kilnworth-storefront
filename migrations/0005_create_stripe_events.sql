-- Every Stripe event this shop has acted on. The event id is the idempotency key: each event's
-- changes run in one batch that starts by inserting this row, so a second delivery of the same
-- event fails on the primary key and the whole batch rolls back.
CREATE TABLE stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  order_id TEXT,
  received_at INTEGER NOT NULL
);

-- The Idempotency-Key the chain service saw for the current send attempt of the order ("<order id>-<attempt>").
-- A retry after a timeout reuses it, so the chain service answers with the first payment instead of sending another.
ALTER TABLE orders ADD COLUMN idempotency_key TEXT;

-- One on-chain transfer (tx hash + log index) credits one order only, enforced by the database and not only by a
-- query. log_index is only written when an order is reconciled, so unpaid and unreconciled rows do not collide.
CREATE UNIQUE INDEX ux_orders_credited_transfer ON orders(tx_hash, log_index);

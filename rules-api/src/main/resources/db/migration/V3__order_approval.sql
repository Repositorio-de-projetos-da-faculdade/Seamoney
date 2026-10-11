-- Approval by a second person, bound to a hash of the payment data, and the ways an order ends before sending.
-- created_* is who made the order; approved_* who approved it (empty user = approved by the policy below the
-- threshold); closed_* who rejected or cancelled it and why.
ALTER TABLE orders ADD COLUMN created_by TEXT;
ALTER TABLE orders ADD COLUMN created_role TEXT;
ALTER TABLE orders ADD COLUMN approved_by TEXT;
ALTER TABLE orders ADD COLUMN approved_role TEXT;
ALTER TABLE orders ADD COLUMN approved_at TEXT;
ALTER TABLE orders ADD COLUMN approval_hash TEXT;
ALTER TABLE orders ADD COLUMN approval_auto INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN closed_by TEXT;
ALTER TABLE orders ADD COLUMN closed_role TEXT;
ALTER TABLE orders ADD COLUMN closed_at TEXT;
ALTER TABLE orders ADD COLUMN closed_reason TEXT;

-- Orders quoted before this migration could be paid at once: they count as approved by the policy.
UPDATE orders SET status = 'approved', approval_auto = 1, approved_at = created_at WHERE status = 'quoted';

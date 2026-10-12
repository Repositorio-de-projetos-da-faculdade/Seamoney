-- The company's own approval threshold (owners change it). Empty means the service default (APPROVAL_THRESHOLD_CENTS).
ALTER TABLE organizations ADD COLUMN approval_threshold_cents BIGINT;

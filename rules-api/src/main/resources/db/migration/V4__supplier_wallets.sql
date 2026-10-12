-- Supplier wallets as versioned proposals: a new or changed address waits for a second person, and at most one
-- version per supplier and network is approved (the service revokes the previous one when it approves a new one).
-- suppliers.wallet_address stays for orders made before the registry; a supplier with wallet rows is paid only to
-- its approved one.
ALTER TABLE suppliers ADD COLUMN city TEXT;
ALTER TABLE suppliers ADD COLUMN port TEXT;
ALTER TABLE suppliers ADD COLUMN email TEXT;

CREATE TABLE supplier_wallets (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    supplier_id TEXT NOT NULL REFERENCES suppliers(id),
    network TEXT NOT NULL,
    address TEXT NOT NULL,
    version INTEGER NOT NULL,
    status TEXT NOT NULL,
    proposed_by TEXT,
    proposed_role TEXT,
    proposed_at TEXT NOT NULL,
    approved_by TEXT,
    approved_role TEXT,
    approved_at TEXT,
    UNIQUE (supplier_id, network, version)
);

CREATE INDEX idx_wallets_supplier ON supplier_wallets(organization_id, supplier_id);

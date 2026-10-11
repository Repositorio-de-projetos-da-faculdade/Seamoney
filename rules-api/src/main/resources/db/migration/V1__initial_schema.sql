CREATE TABLE organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE memberships (
    user_id TEXT NOT NULL REFERENCES users(id),
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    role TEXT NOT NULL,
    status TEXT NOT NULL,
    PRIMARY KEY (user_id, organization_id)
);

CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    organization_id TEXT,
    actor_id TEXT,
    actor_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    before_state TEXT,
    after_state TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE suppliers (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    country TEXT,
    wallet_address TEXT NOT NULL,
    network TEXT NOT NULL DEFAULT 'tempo',
    created_at TEXT NOT NULL,
    UNIQUE (organization_id, name)
);

CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    reference TEXT NOT NULL UNIQUE,
    supplier_id TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    supplier_country TEXT,
    supplier_wallet TEXT NOT NULL,
    network TEXT NOT NULL DEFAULT 'tempo',
    invoice_number TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    due_date TEXT,
    fee_bps INTEGER NOT NULL,
    fee_cents INTEGER NOT NULL,
    total_cents INTEGER NOT NULL,
    bank_fee_pct DOUBLE PRECISION NOT NULL,
    fx_rate DOUBLE PRECISION,
    total_brl_cents INTEGER,
    status TEXT NOT NULL,
    extraction_source TEXT,
    invoice_filename TEXT,
    tx_hash TEXT,
    block_number BIGINT,
    log_index INTEGER,
    memo_hex TEXT,
    confirm_ms BIGINT,
    paid_at TEXT,
    reconciled_at TEXT,
    recon_json TEXT,
    error TEXT,
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_orders_org_status ON orders(organization_id, status);
CREATE INDEX idx_orders_org_created ON orders(organization_id, created_at);

CREATE TABLE order_events (
    id BIGSERIAL PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    order_id TEXT NOT NULL REFERENCES orders(id),
    ts TEXT NOT NULL,
    type TEXT NOT NULL,
    detail TEXT
);

CREATE INDEX idx_events_order ON order_events(order_id);

CREATE TABLE leads (
    id BIGSERIAL PRIMARY KEY,
    organization_id TEXT REFERENCES organizations(id),
    email TEXT,
    monthly_usd INTEGER,
    bank_fee_pct DOUBLE PRECISION,
    country TEXT,
    consent INTEGER NOT NULL,
    created_at TEXT NOT NULL
);


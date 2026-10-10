-- `network` was added after the first release; OrderRepository adds the column to databases created before it.
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  country TEXT,
  wallet_address TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'tempo',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
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
  bank_fee_pct REAL NOT NULL,
  fx_rate REAL,
  total_brl_cents INTEGER,
  status TEXT NOT NULL,
  extraction_source TEXT,
  invoice_filename TEXT,
  tx_hash TEXT,
  block_number INTEGER,
  log_index INTEGER,
  memo_hex TEXT,
  confirm_ms INTEGER,
  paid_at TEXT,
  reconciled_at TEXT,
  recon_json TEXT,
  error TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  type TEXT NOT NULL,
  detail TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_order ON order_events(order_id);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT,
  monthly_usd INTEGER,
  bank_fee_pct REAL,
  country TEXT,
  consent INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

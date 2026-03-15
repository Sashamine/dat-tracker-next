-- mNAV snapshot table: stores periodic mNAV calculations for 24hr change tracking.
-- Replaces the fragile "reconstruct yesterday from price history" approach.

CREATE TABLE IF NOT EXISTS mnav_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker TEXT NOT NULL,
  mnav REAL,
  stock_price_usd REAL NOT NULL,
  crypto_price_usd REAL NOT NULL,
  market_cap_usd REAL,
  crypto_nav_usd REAL,
  ev_usd REAL,
  captured_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- Denormalized for fast lookups
  capture_date TEXT NOT NULL  -- YYYY-MM-DD, for finding "yesterday's" snapshot
);

-- Fast lookup: most recent snapshot per ticker on a given date
CREATE INDEX IF NOT EXISTS idx_mnav_snapshots_ticker_date
  ON mnav_snapshots (ticker, capture_date DESC);

-- Cleanup: keep 7 days of snapshots (cron can prune older)
CREATE INDEX IF NOT EXISTS idx_mnav_snapshots_captured_at
  ON mnav_snapshots (captured_at);

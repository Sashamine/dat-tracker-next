-- Migration 019: D1 as Single Source of Truth
-- Creates tables for entities, instruments, purchases, secondary_holdings,
-- investments, capital_events, and assumptions.
-- These replace static TypeScript files with D1 as the canonical data store.

-- Company metadata (replaces companies.ts non-financial fields)
CREATE TABLE IF NOT EXISTS entities (
  entity_id TEXT PRIMARY KEY,        -- ticker (e.g., 'MSTR', 'BMNR')
  name TEXT NOT NULL,
  asset TEXT NOT NULL,               -- BTC, ETH, SOL, etc.
  tier INTEGER DEFAULT 2,
  country TEXT,
  jurisdiction TEXT,
  currency TEXT DEFAULT 'USD',
  exchange_mic TEXT,
  sec_cik TEXT,
  dat_start_date TEXT,
  is_miner INTEGER DEFAULT 0,       -- SQLite boolean
  treasury_model TEXT,               -- pure_treasury, hybrid, operating_with_treasury
  website TEXT,
  twitter TEXT,
  investor_relations_url TEXT,
  leader TEXT,
  strategy TEXT,
  notes TEXT,
  -- Source methodology (from company-sources.ts)
  official_dashboard TEXT,
  official_dashboard_name TEXT,
  official_mnav_note TEXT,
  shares_source TEXT,                -- diluted, basic, basic_plus_prefunded, assumed_diluted, unknown
  shares_notes TEXT,
  reports_holdings_frequency TEXT,   -- daily, weekly, monthly, quarterly, on_purchase
  reports_mnav_daily INTEGER DEFAULT 0,
  -- Regulatory identifiers (from company-sources.ts)
  edinet_code TEXT,
  hkex_stock_code TEXT,
  euronext_isin TEXT,
  ngm_isin TEXT,
  sedar_isin TEXT,
  sedar_profile TEXT,
  cusip TEXT,
  isin TEXT,
  exchange TEXT,
  -- Overflow for rarely-used fields
  metadata_json TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_entities_asset ON entities(asset);
CREATE INDEX IF NOT EXISTS idx_entities_tier ON entities(tier);

-- Dilutive instruments (replaces dilutive-instruments.ts)
CREATE TABLE IF NOT EXISTS instruments (
  instrument_id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  type TEXT NOT NULL,                 -- convertible, warrant, option, preferred, rsu, free_shares
  name TEXT,
  strike_price REAL NOT NULL,
  potential_shares REAL NOT NULL,
  face_value REAL,                    -- USD face value (for converts)
  coupon_rate REAL,
  settlement_type TEXT,               -- full_share, net_share, cash_only, issuer_election
  issued_date TEXT,
  expiration TEXT,
  included_in_base INTEGER DEFAULT 0, -- SQLite boolean
  source TEXT,
  source_url TEXT,
  artifact_id TEXT,
  status TEXT DEFAULT 'active',       -- active, expired, converted, redeemed
  notes TEXT,
  metadata_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (entity_id) REFERENCES entities(entity_id)
);

CREATE INDEX IF NOT EXISTS idx_instruments_entity ON instruments(entity_id);
CREATE INDEX IF NOT EXISTS idx_instruments_status ON instruments(status);

-- Purchase history (replaces purchases-history.ts)
CREATE TABLE IF NOT EXISTS purchases (
  purchase_id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  asset TEXT NOT NULL,
  date TEXT NOT NULL,
  quantity REAL NOT NULL,
  price_per_unit REAL NOT NULL,
  total_cost REAL NOT NULL,
  source TEXT,
  source_url TEXT,
  artifact_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (entity_id) REFERENCES entities(entity_id)
);

CREATE INDEX IF NOT EXISTS idx_purchases_entity ON purchases(entity_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);

-- Multi-asset holdings beyond primary (replaces secondaryCryptoHoldings)
CREATE TABLE IF NOT EXISTS secondary_holdings (
  holding_id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount REAL NOT NULL,
  as_of TEXT,
  source TEXT,
  source_url TEXT,
  note TEXT,
  FOREIGN KEY (entity_id) REFERENCES entities(entity_id)
);

CREATE INDEX IF NOT EXISTS idx_secondary_holdings_entity ON secondary_holdings(entity_id);

-- Indirect crypto exposure: funds, ETFs, LSTs (replaces cryptoInvestments)
CREATE TABLE IF NOT EXISTS investments (
  investment_id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,                 -- fund, equity, etf, lst
  underlying_asset TEXT,
  fair_value REAL,
  source_date TEXT,
  source TEXT,
  source_url TEXT,
  lst_amount REAL,
  exchange_rate REAL,
  underlying_amount REAL,
  note TEXT,
  metadata_json TEXT,
  FOREIGN KEY (entity_id) REFERENCES entities(entity_id)
);

CREATE INDEX IF NOT EXISTS idx_investments_entity ON investments(entity_id);

-- Capital events timeline (replaces mstr-capital-events.ts, generalizes to all companies)
CREATE TABLE IF NOT EXISTS capital_events (
  event_id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,                 -- BTC, DEBT, PREF, ATM, DEBT_EVENT, CORP
  description TEXT,
  filed_date TEXT,
  accession_number TEXT,
  source_url TEXT,
  item TEXT,                          -- SEC Item number (e.g., "8.01")
  section TEXT,                       -- Named section within Item
  data_json TEXT,                     -- type-specific fields as JSON
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (entity_id) REFERENCES entities(entity_id)
);

CREATE INDEX IF NOT EXISTS idx_capital_events_entity ON capital_events(entity_id);
CREATE INDEX IF NOT EXISTS idx_capital_events_date ON capital_events(date);
CREATE INDEX IF NOT EXISTS idx_capital_events_type ON capital_events(type);

-- Assumptions register (replaces assumptions.ts)
CREATE TABLE IF NOT EXISTS assumptions (
  assumption_id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  field TEXT NOT NULL,
  assumption TEXT NOT NULL,
  reason TEXT,
  trigger_event TEXT,                 -- 'trigger' is reserved in SQL
  source_needed TEXT,
  resolution_path TEXT,
  sensitivity TEXT,                   -- low, medium, high
  materiality TEXT,                   -- low, medium, high
  status TEXT DEFAULT 'open',         -- open, monitoring, resolved
  last_reviewed TEXT,
  introduced_by TEXT,
  review_notes TEXT,
  resolved_date TEXT,
  resolved_notes TEXT,
  FOREIGN KEY (entity_id) REFERENCES entities(entity_id)
);

CREATE INDEX IF NOT EXISTS idx_assumptions_entity ON assumptions(entity_id);
CREATE INDEX IF NOT EXISTS idx_assumptions_status ON assumptions(status);

-- Shadow divergences table (for Phase 3 shadow mode)
CREATE TABLE IF NOT EXISTS shadow_divergences (
  divergence_id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  field TEXT NOT NULL,
  static_value TEXT,
  d1_value TEXT,
  pct_diff REAL,
  detected_at TEXT DEFAULT (datetime('now')),
  resolved INTEGER DEFAULT 0,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_shadow_divergences_entity ON shadow_divergences(entity_id);
CREATE INDEX IF NOT EXISTS idx_shadow_divergences_resolved ON shadow_divergences(resolved);

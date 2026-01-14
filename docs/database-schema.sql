-- DAT Tracker Database Schema
-- PostgreSQL schema for tracking Digital Asset Treasury companies
-- Version 1.0

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE asset_type AS ENUM (
  'BTC', 'ETH', 'SOL', 'HYPE', 'BNB', 'TAO', 'LINK',
  'TRX', 'XRP', 'ZEC', 'LTC', 'SUI', 'DOGE', 'AVAX', 'ADA', 'HBAR'
);

CREATE TYPE company_tier AS ENUM ('1', '2', '3');

CREATE TYPE holdings_source AS ENUM (
  '8-K filing',
  '10-Q filing',
  '10-K filing',
  'press release',
  'company website',
  'exchange filing',      -- TSE, HKEX, Euronext, etc.
  'bitcointreasuries.net',
  'manual',
  'api',
  'scraper'
);

CREATE TYPE data_status AS ENUM (
  'pending',      -- Scraped but not reviewed
  'approved',     -- Verified and approved
  'rejected',     -- Rejected as incorrect
  'superseded'    -- Replaced by newer data
);

CREATE TYPE scraper_job_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled'
);

-- ============================================
-- CORE TABLES
-- ============================================

-- Assets (cryptocurrencies tracked)
CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(10) UNIQUE NOT NULL,  -- BTC, ETH, SOL, etc.
  name VARCHAR(100) NOT NULL,          -- Bitcoin, Ethereum, Solana
  coingecko_id VARCHAR(50),            -- For price API
  binance_symbol VARCHAR(20),          -- BTCUSDT, ETHUSDT
  decimals INT DEFAULT 8,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "mstr", "bmnr" (from current data)
  name VARCHAR(200) NOT NULL,
  ticker VARCHAR(20) NOT NULL,              -- MSTR, BMNR, 3350.T
  asset_id INT REFERENCES assets(id),
  tier company_tier NOT NULL DEFAULT '2',

  -- Current holdings (denormalized for quick access)
  current_holdings DECIMAL(20, 8) DEFAULT 0,
  holdings_last_updated TIMESTAMPTZ,
  holdings_source holdings_source,

  -- Company info
  website VARCHAR(500),
  twitter VARCHAR(200),
  logo_url VARCHAR(500),

  -- Tokenized equity
  tokenized_address VARCHAR(100),
  tokenized_chain VARCHAR(50),

  -- Exchange info
  exchange VARCHAR(50),                     -- NYSE, NASDAQ, TSE, HKEX, etc.
  country VARCHAR(50),

  -- Company classification
  is_miner BOOLEAN DEFAULT FALSE,
  dat_start_date DATE,                      -- When they started DAT strategy

  -- Leadership
  leader VARCHAR(200),
  strategy TEXT,
  notes TEXT,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_companies_ticker ON companies(ticker);
CREATE INDEX idx_companies_asset ON companies(asset_id);
CREATE INDEX idx_companies_tier ON companies(tier);

-- Company financials (can change frequently, separate table)
CREATE TABLE company_financials (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,

  -- Cost basis
  cost_basis_avg DECIMAL(20, 2),

  -- Staking
  staking_pct DECIMAL(5, 4),                -- 0.0000 to 1.0000
  staking_apy DECIMAL(5, 4),
  staking_method VARCHAR(200),

  -- Burn rate
  quarterly_burn_usd DECIMAL(20, 2),
  burn_source VARCHAR(200),

  -- Capital raised
  capital_raised_atm DECIMAL(20, 2),
  capital_raised_pipe DECIMAL(20, 2),
  capital_raised_converts DECIMAL(20, 2),
  atm_remaining DECIMAL(20, 2),
  avg_issuance_premium DECIMAL(5, 4),

  -- Trading
  avg_daily_volume DECIMAL(20, 2),
  has_options BOOLEAN DEFAULT FALSE,
  options_oi DECIMAL(20, 2),

  -- Market data (cached from price feed)
  market_cap DECIMAL(20, 2),
  shares_outstanding DECIMAL(20, 0),

  -- Leverage
  leverage_ratio DECIMAL(5, 2),

  -- Mining specific (BTC miners)
  btc_mined_annual DECIMAL(20, 8),
  btc_acquired_ytd DECIMAL(20, 8),

  -- Validity period
  effective_date DATE NOT NULL,
  end_date DATE,                            -- NULL = current

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, effective_date)
);

CREATE INDEX idx_company_financials_company ON company_financials(company_id);
CREATE INDEX idx_company_financials_effective ON company_financials(effective_date);

-- ============================================
-- HOLDINGS TRACKING
-- ============================================

-- Holdings snapshots (historical record)
CREATE TABLE holdings_snapshots (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,

  -- Holdings data
  holdings DECIMAL(20, 8) NOT NULL,
  shares_outstanding DECIMAL(20, 0),
  holdings_per_share DECIMAL(20, 12),       -- Calculated: holdings / shares

  -- Source tracking
  source holdings_source NOT NULL,
  source_url VARCHAR(1000),                 -- Link to filing/press release
  source_document VARCHAR(200),             -- "Q3 2024 10-Q", "8-K filing"

  -- Dates
  snapshot_date DATE NOT NULL,              -- The date this data is for
  filing_date DATE,                         -- When it was filed/announced

  -- Review workflow
  status data_status DEFAULT 'pending',
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Scraper metadata
  scraped_at TIMESTAMPTZ,
  scraper_job_id INT,                       -- Reference to scraper job
  raw_data JSONB,                           -- Original scraped data

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, snapshot_date, source)
);

CREATE INDEX idx_holdings_company ON holdings_snapshots(company_id);
CREATE INDEX idx_holdings_date ON holdings_snapshots(snapshot_date);
CREATE INDEX idx_holdings_status ON holdings_snapshots(status);
CREATE INDEX idx_holdings_company_date ON holdings_snapshots(company_id, snapshot_date DESC);

-- ============================================
-- PRICE DATA
-- ============================================

-- Crypto prices (historical)
CREATE TABLE crypto_prices (
  id SERIAL PRIMARY KEY,
  asset_id INT REFERENCES assets(id) ON DELETE CASCADE,

  price_usd DECIMAL(20, 8) NOT NULL,
  change_24h DECIMAL(10, 4),                -- Percentage
  volume_24h DECIMAL(20, 2),
  market_cap DECIMAL(20, 2),

  timestamp TIMESTAMPTZ NOT NULL,
  source VARCHAR(50),                       -- binance, coingecko, etc.

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(asset_id, timestamp)
);

CREATE INDEX idx_crypto_prices_asset ON crypto_prices(asset_id);
CREATE INDEX idx_crypto_prices_time ON crypto_prices(timestamp);
CREATE INDEX idx_crypto_prices_asset_time ON crypto_prices(asset_id, timestamp DESC);

-- Stock prices (historical)
CREATE TABLE stock_prices (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,

  price DECIMAL(20, 4) NOT NULL,
  change_24h DECIMAL(10, 4),                -- Percentage
  volume DECIMAL(20, 0),
  market_cap DECIMAL(20, 2),
  shares_outstanding DECIMAL(20, 0),
  pe_ratio DECIMAL(10, 2),

  -- Market hours context
  is_regular_hours BOOLEAN DEFAULT TRUE,
  is_extended_hours BOOLEAN DEFAULT FALSE,

  timestamp TIMESTAMPTZ NOT NULL,
  source VARCHAR(50),                       -- alpaca, yahoo, etc.

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, timestamp)
);

CREATE INDEX idx_stock_prices_company ON stock_prices(company_id);
CREATE INDEX idx_stock_prices_time ON stock_prices(timestamp);
CREATE INDEX idx_stock_prices_company_time ON stock_prices(company_id, timestamp DESC);

-- Latest prices cache (for quick lookups)
CREATE TABLE latest_prices (
  id SERIAL PRIMARY KEY,

  -- Either crypto or stock
  asset_id INT REFERENCES assets(id) ON DELETE CASCADE,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,

  price DECIMAL(20, 8) NOT NULL,
  change_24h DECIMAL(10, 4),
  volume DECIMAL(20, 2),
  market_cap DECIMAL(20, 2),

  updated_at TIMESTAMPTZ NOT NULL,
  source VARCHAR(50),

  CHECK (
    (asset_id IS NOT NULL AND company_id IS NULL) OR
    (asset_id IS NULL AND company_id IS NOT NULL)
  ),

  UNIQUE(asset_id),
  UNIQUE(company_id)
);

-- ============================================
-- SCRAPER INFRASTRUCTURE
-- ============================================

-- Data sources configuration
CREATE TABLE data_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,        -- "sec_edgar", "hkex", "globenewswire"
  type VARCHAR(50) NOT NULL,                -- "filing", "press_release", "api"
  base_url VARCHAR(500),

  -- Configuration
  config JSONB,                             -- Source-specific settings

  -- Rate limiting
  rate_limit_requests INT DEFAULT 10,
  rate_limit_period_seconds INT DEFAULT 60,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_successful_run TIMESTAMPTZ,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scraper jobs
CREATE TABLE scraper_jobs (
  id SERIAL PRIMARY KEY,
  source_id INT REFERENCES data_sources(id),
  company_id INT REFERENCES companies(id),  -- NULL = run for all companies

  -- Job details
  job_type VARCHAR(50) NOT NULL,            -- "holdings_update", "price_fetch"
  status scraper_job_status DEFAULT 'pending',
  priority INT DEFAULT 0,                   -- Higher = more urgent

  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Results
  records_found INT DEFAULT 0,
  records_created INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  error_message TEXT,

  -- Execution details
  execution_log TEXT,
  raw_response JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scraper_jobs_status ON scraper_jobs(status);
CREATE INDEX idx_scraper_jobs_scheduled ON scraper_jobs(scheduled_at);
CREATE INDEX idx_scraper_jobs_source ON scraper_jobs(source_id);

-- Company data source mapping
-- Which sources to use for which companies
CREATE TABLE company_sources (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  source_id INT REFERENCES data_sources(id) ON DELETE CASCADE,

  -- Source-specific identifiers
  external_id VARCHAR(200),                 -- CIK number, HKEX code, etc.
  config JSONB,                             -- Company-specific source config

  is_primary BOOLEAN DEFAULT FALSE,         -- Primary source for this company
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, source_id)
);

-- ============================================
-- ADMIN / AUDIT
-- ============================================

-- User overrides (manual corrections from Google Sheets, etc.)
CREATE TABLE company_overrides (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,

  field_name VARCHAR(100) NOT NULL,         -- "holdings", "market_cap", etc.
  override_value TEXT NOT NULL,
  original_value TEXT,

  reason TEXT,
  source VARCHAR(200),                      -- "google_sheets", "manual"

  applied_by VARCHAR(100),
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,                   -- NULL = permanent

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_overrides_company ON company_overrides(company_id);
CREATE INDEX idx_overrides_active ON company_overrides(is_active);

-- Audit log
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,

  table_name VARCHAR(100) NOT NULL,
  record_id INT NOT NULL,
  action VARCHAR(20) NOT NULL,              -- INSERT, UPDATE, DELETE

  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],

  user_id VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_table ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_time ON audit_log(created_at);

-- ============================================
-- VIEWS
-- ============================================

-- Current company holdings with calculated metrics
CREATE VIEW v_company_holdings AS
SELECT
  c.id,
  c.external_id,
  c.name,
  c.ticker,
  a.symbol as asset,
  c.tier,
  c.current_holdings,
  c.holdings_last_updated,
  c.holdings_source,
  cf.market_cap,
  cf.shares_outstanding,
  lp_crypto.price as crypto_price,
  lp_stock.price as stock_price,
  CASE
    WHEN lp_crypto.price > 0 THEN c.current_holdings * lp_crypto.price
    ELSE 0
  END as holdings_value,
  CASE
    WHEN cf.market_cap > 0 AND c.current_holdings > 0 AND lp_crypto.price > 0
    THEN cf.market_cap / (c.current_holdings * lp_crypto.price)
    ELSE NULL
  END as mnav
FROM companies c
LEFT JOIN assets a ON c.asset_id = a.id
LEFT JOIN company_financials cf ON cf.company_id = c.id AND cf.end_date IS NULL
LEFT JOIN latest_prices lp_crypto ON lp_crypto.asset_id = a.id
LEFT JOIN latest_prices lp_stock ON lp_stock.company_id = c.id
WHERE c.is_active = TRUE;

-- Holdings needing review
CREATE VIEW v_pending_holdings AS
SELECT
  hs.*,
  c.name as company_name,
  c.ticker,
  a.symbol as asset
FROM holdings_snapshots hs
JOIN companies c ON hs.company_id = c.id
JOIN assets a ON c.asset_id = a.id
WHERE hs.status = 'pending'
ORDER BY c.tier, hs.snapshot_date DESC;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update company's current holdings from latest approved snapshot
CREATE OR REPLACE FUNCTION update_company_holdings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    UPDATE companies
    SET
      current_holdings = NEW.holdings,
      holdings_last_updated = NEW.snapshot_date,
      holdings_source = NEW.source,
      updated_at = NOW()
    WHERE id = NEW.company_id
    AND (holdings_last_updated IS NULL OR holdings_last_updated <= NEW.snapshot_date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_holdings
AFTER INSERT OR UPDATE OF status ON holdings_snapshots
FOR EACH ROW
EXECUTE FUNCTION update_company_holdings();

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_companies_timestamp
BEFORE UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_financials_timestamp
BEFORE UPDATE ON company_financials
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================
-- SEED DATA: Assets
-- ============================================

INSERT INTO assets (symbol, name, coingecko_id, binance_symbol) VALUES
('BTC', 'Bitcoin', 'bitcoin', 'BTCUSDT'),
('ETH', 'Ethereum', 'ethereum', 'ETHUSDT'),
('SOL', 'Solana', 'solana', 'SOLUSDT'),
('HYPE', 'Hyperliquid', 'hyperliquid', NULL),
('BNB', 'BNB', 'binancecoin', 'BNBUSDT'),
('TAO', 'Bittensor', 'bittensor', 'TAOUSDT'),
('LINK', 'Chainlink', 'chainlink', 'LINKUSDT'),
('TRX', 'Tron', 'tron', 'TRXUSDT'),
('XRP', 'XRP', 'ripple', 'XRPUSDT'),
('ZEC', 'Zcash', 'zcash', 'ZECUSDT'),
('LTC', 'Litecoin', 'litecoin', 'LTCUSDT'),
('SUI', 'Sui', 'sui', 'SUIUSDT'),
('DOGE', 'Dogecoin', 'dogecoin', 'DOGEUSDT'),
('AVAX', 'Avalanche', 'avalanche-2', 'AVAXUSDT'),
('ADA', 'Cardano', 'cardano', 'ADAUSDT'),
('HBAR', 'Hedera', 'hedera-hashgraph', 'HBARUSDT');

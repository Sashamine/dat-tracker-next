-- Full DAT Tracker Schema Migration
-- This creates all tables needed for automated holdings tracking

-- ============================================
-- ENUMS (if not exists)
-- ============================================

DO $$ BEGIN
  CREATE TYPE asset_type AS ENUM (
    'BTC', 'ETH', 'SOL', 'HYPE', 'BNB', 'TAO', 'LINK',
    'TRX', 'XRP', 'ZEC', 'LTC', 'SUI', 'DOGE', 'AVAX', 'ADA', 'HBAR'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE company_tier AS ENUM ('1', '2', '3');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE holdings_source AS ENUM (
    'sec-8k', 'sec-10q', 'sec-10k', 'press-release', 'company-website',
    'exchange-filing', 'aggregator', 'twitter', 'manual', 'api'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE snapshot_status AS ENUM ('pending', 'approved', 'rejected', 'superseded');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- CORE TABLES
-- ============================================

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  coingecko_id VARCHAR(50),
  binance_symbol VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  ticker VARCHAR(20) NOT NULL,
  asset_id INT REFERENCES assets(id),
  tier company_tier NOT NULL DEFAULT '2',

  -- Current holdings (updated by trigger)
  current_holdings DECIMAL(20, 8) DEFAULT 0,
  holdings_last_updated DATE,
  holdings_source holdings_source,

  -- Company info
  website VARCHAR(500),
  twitter VARCHAR(200),
  sec_cik VARCHAR(20),

  -- Classification
  is_miner BOOLEAN DEFAULT FALSE,
  dat_start_date DATE,

  -- Metadata
  leader VARCHAR(200),
  strategy TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker);
CREATE INDEX IF NOT EXISTS idx_companies_asset ON companies(asset_id);

-- Holdings snapshots (historical record with approval workflow)
CREATE TABLE IF NOT EXISTS holdings_snapshots (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,

  -- Holdings data
  holdings DECIMAL(20, 8) NOT NULL,
  shares_outstanding DECIMAL(20, 0),
  holdings_per_share DECIMAL(20, 12),

  -- Source tracking
  source holdings_source NOT NULL,
  source_url VARCHAR(1000),
  source_text TEXT,

  -- Dates
  snapshot_date DATE NOT NULL,
  filing_date DATE,

  -- LLM extraction metadata
  extraction_confidence DECIMAL(5, 4),
  extraction_reasoning TEXT,
  llm_model VARCHAR(100),

  -- Review workflow
  status snapshot_status DEFAULT 'pending',
  auto_approved BOOLEAN DEFAULT FALSE,
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, snapshot_date, source)
);

CREATE INDEX IF NOT EXISTS idx_holdings_company ON holdings_snapshots(company_id);
CREATE INDEX IF NOT EXISTS idx_holdings_date ON holdings_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_holdings_status ON holdings_snapshots(status);

-- ============================================
-- TRIGGER: Auto-update company holdings
-- ============================================

CREATE OR REPLACE FUNCTION update_company_current_holdings()
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

DROP TRIGGER IF EXISTS trigger_update_company_holdings ON holdings_snapshots;
CREATE TRIGGER trigger_update_company_holdings
AFTER INSERT OR UPDATE OF status ON holdings_snapshots
FOR EACH ROW
EXECUTE FUNCTION update_company_current_holdings();

-- ============================================
-- SEED: Assets
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
('HBAR', 'Hedera', 'hedera-hashgraph', 'HBARUSDT')
ON CONFLICT (symbol) DO NOTHING;

-- ============================================
-- HELPER FUNCTION: Approve and update holdings
-- ============================================

CREATE OR REPLACE FUNCTION approve_holdings_snapshot(
  p_snapshot_id INT,
  p_reviewer VARCHAR(100) DEFAULT 'system'
) RETURNS VOID AS $$
BEGIN
  UPDATE holdings_snapshots
  SET
    status = 'approved',
    reviewed_by = p_reviewer,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_snapshot_id
  AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTION: Insert and auto-approve trusted sources
-- ============================================

CREATE OR REPLACE FUNCTION insert_holdings_update(
  p_company_ticker VARCHAR(20),
  p_holdings DECIMAL(20, 8),
  p_source holdings_source,
  p_snapshot_date DATE,
  p_source_url VARCHAR(1000) DEFAULT NULL,
  p_source_text TEXT DEFAULT NULL,
  p_confidence DECIMAL(5, 4) DEFAULT NULL,
  p_auto_approve BOOLEAN DEFAULT FALSE
) RETURNS INT AS $$
DECLARE
  v_company_id INT;
  v_snapshot_id INT;
BEGIN
  -- Get company ID
  SELECT id INTO v_company_id FROM companies WHERE ticker = p_company_ticker;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Company not found: %', p_company_ticker;
  END IF;

  -- Insert snapshot
  INSERT INTO holdings_snapshots (
    company_id, holdings, source, snapshot_date,
    source_url, source_text, extraction_confidence,
    status, auto_approved
  ) VALUES (
    v_company_id, p_holdings, p_source, p_snapshot_date,
    p_source_url, p_source_text, p_confidence,
    CASE WHEN p_auto_approve THEN 'approved' ELSE 'pending' END,
    p_auto_approve
  )
  ON CONFLICT (company_id, snapshot_date, source)
  DO UPDATE SET
    holdings = EXCLUDED.holdings,
    source_url = EXCLUDED.source_url,
    source_text = EXCLUDED.source_text,
    extraction_confidence = EXCLUDED.extraction_confidence,
    updated_at = NOW()
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql;

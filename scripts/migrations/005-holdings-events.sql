-- Holdings Events Table
-- Event-sourced architecture for real-time holdings tracking
-- Each source writes events; latest event = current holdings

-- ============================================
-- EXTEND SOURCE TYPES
-- ============================================

-- Add new source types for real-time/on-chain data
ALTER TYPE holdings_source ADD VALUE IF NOT EXISTS 'on-chain';
ALTER TYPE holdings_source ADD VALUE IF NOT EXISTS 'arkham';
ALTER TYPE holdings_source ADD VALUE IF NOT EXISTS 'mempool';
ALTER TYPE holdings_source ADD VALUE IF NOT EXISTS 'validator';
ALTER TYPE holdings_source ADD VALUE IF NOT EXISTS 'tracker';

-- ============================================
-- HOLDINGS EVENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS holdings_events (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,

  -- Holdings data
  holdings DECIMAL(20, 8) NOT NULL,

  -- Source attribution (the key differentiator)
  source_type holdings_source NOT NULL,
  source_url VARCHAR(1000),          -- Link to proof (mempool tx, Arkham page, etc.)
  source_id VARCHAR(200),            -- External ID (Arkham entity slug, wallet address, etc.)

  -- Confidence/trust level (1.0 = on-chain verified, 0.9 = official tracker, etc.)
  confidence DECIMAL(3, 2) NOT NULL DEFAULT 1.0,

  -- Timestamps
  event_time TIMESTAMPTZ NOT NULL,   -- When the holdings were at this value
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Optional metadata
  raw_data JSONB                      -- Store original API response for debugging
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_holdings_events_company ON holdings_events(company_id);
CREATE INDEX IF NOT EXISTS idx_holdings_events_time ON holdings_events(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_holdings_events_source ON holdings_events(source_type);
CREATE INDEX IF NOT EXISTS idx_holdings_events_latest ON holdings_events(company_id, event_time DESC);

-- ============================================
-- VIEW: Latest holdings per company
-- ============================================

CREATE OR REPLACE VIEW latest_holdings AS
SELECT DISTINCT ON (company_id)
  company_id,
  holdings,
  source_type,
  source_url,
  confidence,
  event_time,
  created_at
FROM holdings_events
ORDER BY company_id, event_time DESC;

-- ============================================
-- FUNCTION: Insert holdings event
-- ============================================

CREATE OR REPLACE FUNCTION insert_holdings_event(
  p_ticker VARCHAR(20),
  p_holdings DECIMAL(20, 8),
  p_source_type holdings_source,
  p_source_url VARCHAR(1000) DEFAULT NULL,
  p_source_id VARCHAR(200) DEFAULT NULL,
  p_confidence DECIMAL(3, 2) DEFAULT 1.0,
  p_event_time TIMESTAMPTZ DEFAULT NOW(),
  p_raw_data JSONB DEFAULT NULL
) RETURNS INT AS $$
DECLARE
  v_company_id INT;
  v_event_id INT;
  v_previous_holdings DECIMAL(20, 8);
BEGIN
  -- Get company ID
  SELECT id INTO v_company_id FROM companies WHERE ticker = p_ticker;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Company not found: %', p_ticker;
  END IF;

  -- Get previous holdings to check for change
  SELECT holdings INTO v_previous_holdings
  FROM holdings_events
  WHERE company_id = v_company_id
  ORDER BY event_time DESC
  LIMIT 1;

  -- Only insert if holdings changed (avoid duplicate events)
  IF v_previous_holdings IS NULL OR v_previous_holdings != p_holdings THEN
    INSERT INTO holdings_events (
      company_id, holdings, source_type, source_url, source_id,
      confidence, event_time, raw_data
    ) VALUES (
      v_company_id, p_holdings, p_source_type, p_source_url, p_source_id,
      p_confidence, p_event_time, p_raw_data
    )
    RETURNING id INTO v_event_id;

    -- Update companies.current_holdings for high-confidence sources
    IF p_confidence >= 0.9 THEN
      UPDATE companies
      SET
        current_holdings = p_holdings,
        holdings_last_updated = p_event_time::DATE,
        holdings_source = p_source_type,
        updated_at = NOW()
      WHERE id = v_company_id
      AND (holdings_last_updated IS NULL OR holdings_last_updated <= p_event_time::DATE);
    END IF;

    RETURN v_event_id;
  END IF;

  RETURN NULL; -- No change, no event created
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLE: Real-time source configuration
-- ============================================

CREATE TABLE IF NOT EXISTS realtime_sources (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,

  -- Source configuration
  source_type holdings_source NOT NULL,
  source_id VARCHAR(200) NOT NULL,     -- Arkham slug, wallet ID, validator address, etc.
  source_url VARCHAR(1000),            -- Base URL for the source

  -- Polling configuration
  poll_interval_seconds INT DEFAULT 900,  -- Default 15 minutes
  is_active BOOLEAN DEFAULT TRUE,

  -- Tracking
  last_polled_at TIMESTAMPTZ,
  last_holdings DECIMAL(20, 8),
  error_count INT DEFAULT 0,
  last_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, source_type)
);

-- ============================================
-- SEED: Real-time sources
-- ============================================

-- XXI (Twenty One Capital) - Mempool proof of reserves
INSERT INTO realtime_sources (company_id, source_type, source_id, source_url, poll_interval_seconds)
SELECT id, 'mempool', 'xxi', 'https://xxi.mempool.space/api/v1/wallet/xxi', 300
FROM companies WHERE ticker = 'XXI'
ON CONFLICT (company_id, source_type) DO NOTHING;

-- Add placeholder for Arkham sources (to be activated when API key obtained)
-- MSTR
INSERT INTO realtime_sources (company_id, source_type, source_id, source_url, poll_interval_seconds, is_active)
SELECT id, 'arkham', 'microstrategy', 'https://api.arkm.com/balances/entity/microstrategy', 900, FALSE
FROM companies WHERE ticker = 'MSTR'
ON CONFLICT (company_id, source_type) DO NOTHING;

-- MARA
INSERT INTO realtime_sources (company_id, source_type, source_id, source_url, poll_interval_seconds, is_active)
SELECT id, 'arkham', 'mara-pool', 'https://api.arkm.com/balances/entity/mara-pool', 900, FALSE
FROM companies WHERE ticker = 'MARA'
ON CONFLICT (company_id, source_type) DO NOTHING;

-- CLSK
INSERT INTO realtime_sources (company_id, source_type, source_id, source_url, poll_interval_seconds, is_active)
SELECT id, 'arkham', 'cleanspark', 'https://api.arkm.com/balances/entity/cleanspark', 900, FALSE
FROM companies WHERE ticker = 'CLSK'
ON CONFLICT (company_id, source_type) DO NOTHING;

-- RIOT
INSERT INTO realtime_sources (company_id, source_type, source_id, source_url, poll_interval_seconds, is_active)
SELECT id, 'arkham', 'riot-platforms', 'https://api.arkm.com/balances/entity/riot-platforms', 900, FALSE
FROM companies WHERE ticker = 'RIOT'
ON CONFLICT (company_id, source_type) DO NOTHING;

-- HUT
INSERT INTO realtime_sources (company_id, source_type, source_id, source_url, poll_interval_seconds, is_active)
SELECT id, 'arkham', 'hut-8', 'https://api.arkm.com/balances/entity/hut-8', 900, FALSE
FROM companies WHERE ticker = 'HUT'
ON CONFLICT (company_id, source_type) DO NOTHING;

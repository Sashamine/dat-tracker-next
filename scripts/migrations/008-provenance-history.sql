-- Provenance History Tables
-- Full citation chain for all company metrics
-- Each event traces back to specific SEC filing + quote

-- ============================================
-- ADD PROVENANCE COLUMNS TO HOLDINGS_EVENTS
-- ============================================

ALTER TABLE holdings_events 
  ADD COLUMN IF NOT EXISTS accession VARCHAR(25),      -- SEC accession number (0001193125-25-262568)
  ADD COLUMN IF NOT EXISTS filing_type VARCHAR(10),    -- 8-K, 10-Q, 10-K
  ADD COLUMN IF NOT EXISTS quote TEXT,                 -- Exact text from document
  ADD COLUMN IF NOT EXISTS anchor VARCHAR(200);        -- Search term to find quote

CREATE INDEX IF NOT EXISTS idx_holdings_events_accession ON holdings_events(accession);

-- ============================================
-- DEBT EVENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS debt_events (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Value
  total_debt DECIMAL(20, 2) NOT NULL,
  
  -- Provenance (SEC citation)
  accession VARCHAR(25) NOT NULL,
  filing_type VARCHAR(10) NOT NULL,
  quote TEXT,
  anchor VARCHAR(200),
  
  -- XBRL reference if applicable
  xbrl_fact VARCHAR(200),
  period_end DATE,
  
  -- Source metadata
  source_url VARCHAR(1000),
  confidence DECIMAL(3, 2) NOT NULL DEFAULT 1.0,
  
  -- Timestamps
  event_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  raw_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_debt_events_company ON debt_events(company_id);
CREATE INDEX IF NOT EXISTS idx_debt_events_time ON debt_events(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_debt_events_accession ON debt_events(accession);

-- ============================================
-- PREFERRED EQUITY EVENTS TABLE  
-- ============================================

CREATE TABLE IF NOT EXISTS preferred_events (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Value
  preferred_equity DECIMAL(20, 2) NOT NULL,
  
  -- Provenance
  accession VARCHAR(25) NOT NULL,
  filing_type VARCHAR(10) NOT NULL,
  quote TEXT,
  anchor VARCHAR(200),
  
  -- XBRL reference
  xbrl_fact VARCHAR(200),
  period_end DATE,
  
  -- Metadata
  source_url VARCHAR(1000),
  confidence DECIMAL(3, 2) NOT NULL DEFAULT 1.0,
  event_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_preferred_events_company ON preferred_events(company_id);
CREATE INDEX IF NOT EXISTS idx_preferred_events_time ON preferred_events(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_preferred_events_accession ON preferred_events(accession);

-- ============================================
-- SHARES EVENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS shares_events (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Value
  shares_outstanding DECIMAL(20, 0) NOT NULL,
  
  -- Provenance
  accession VARCHAR(25) NOT NULL,
  filing_type VARCHAR(10) NOT NULL,
  quote TEXT,
  anchor VARCHAR(200),
  
  -- XBRL reference
  xbrl_fact VARCHAR(200),
  period_end DATE,
  
  -- Metadata
  source_url VARCHAR(1000),
  confidence DECIMAL(3, 2) NOT NULL DEFAULT 1.0,
  event_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_shares_events_company ON shares_events(company_id);
CREATE INDEX IF NOT EXISTS idx_shares_events_time ON shares_events(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_shares_events_accession ON shares_events(accession);

-- ============================================
-- CASH EVENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS cash_events (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Value
  cash_reserves DECIMAL(20, 2) NOT NULL,
  
  -- Provenance
  accession VARCHAR(25) NOT NULL,
  filing_type VARCHAR(10) NOT NULL,
  quote TEXT,
  anchor VARCHAR(200),
  
  -- XBRL reference
  xbrl_fact VARCHAR(200),
  period_end DATE,
  
  -- Metadata
  source_url VARCHAR(1000),
  confidence DECIMAL(3, 2) NOT NULL DEFAULT 1.0,
  event_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_cash_events_company ON cash_events(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_events_time ON cash_events(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_cash_events_accession ON cash_events(accession);

-- ============================================
-- COST BASIS EVENTS TABLE (BTC specific)
-- ============================================

CREATE TABLE IF NOT EXISTS cost_basis_events (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Values
  total_cost DECIMAL(20, 2) NOT NULL,
  avg_cost_per_btc DECIMAL(20, 2),
  
  -- Provenance
  accession VARCHAR(25) NOT NULL,
  filing_type VARCHAR(10) NOT NULL,
  quote TEXT,
  anchor VARCHAR(200),
  
  -- Metadata
  source_url VARCHAR(1000),
  confidence DECIMAL(3, 2) NOT NULL DEFAULT 1.0,
  event_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_cost_basis_events_company ON cost_basis_events(company_id);
CREATE INDEX IF NOT EXISTS idx_cost_basis_events_time ON cost_basis_events(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_cost_basis_events_accession ON cost_basis_events(accession);

-- ============================================
-- VIEWS: Latest values per company
-- ============================================

CREATE OR REPLACE VIEW latest_debt AS
SELECT DISTINCT ON (company_id)
  company_id, total_debt, accession, filing_type, quote, anchor,
  xbrl_fact, period_end, event_time
FROM debt_events
ORDER BY company_id, event_time DESC;

CREATE OR REPLACE VIEW latest_preferred AS
SELECT DISTINCT ON (company_id)
  company_id, preferred_equity, accession, filing_type, quote, anchor,
  xbrl_fact, period_end, event_time
FROM preferred_events
ORDER BY company_id, event_time DESC;

CREATE OR REPLACE VIEW latest_shares AS
SELECT DISTINCT ON (company_id)
  company_id, shares_outstanding, accession, filing_type, quote, anchor,
  xbrl_fact, period_end, event_time
FROM shares_events
ORDER BY company_id, event_time DESC;

CREATE OR REPLACE VIEW latest_cash AS
SELECT DISTINCT ON (company_id)
  company_id, cash_reserves, accession, filing_type, quote, anchor,
  xbrl_fact, period_end, event_time
FROM cash_events
ORDER BY company_id, event_time DESC;

CREATE OR REPLACE VIEW latest_cost_basis AS
SELECT DISTINCT ON (company_id)
  company_id, total_cost, avg_cost_per_btc, accession, filing_type, quote, anchor,
  event_time
FROM cost_basis_events
ORDER BY company_id, event_time DESC;

-- ============================================
-- COMBINED VIEW: Company snapshot with provenance
-- ============================================

CREATE OR REPLACE VIEW company_snapshot AS
SELECT 
  c.id,
  c.ticker,
  c.name,
  
  -- Holdings
  lh.holdings,
  lh.accession as holdings_accession,
  lh.event_time as holdings_date,
  
  -- Debt
  ld.total_debt,
  ld.accession as debt_accession,
  ld.event_time as debt_date,
  
  -- Preferred
  lp.preferred_equity,
  lp.accession as preferred_accession,
  lp.event_time as preferred_date,
  
  -- Shares
  ls.shares_outstanding,
  ls.accession as shares_accession,
  ls.event_time as shares_date,
  
  -- Cash
  lc.cash_reserves,
  lc.accession as cash_accession,
  lc.event_time as cash_date,
  
  -- Cost basis
  lcb.total_cost,
  lcb.avg_cost_per_btc,
  lcb.accession as cost_accession,
  lcb.event_time as cost_date

FROM companies c
LEFT JOIN latest_holdings lh ON lh.company_id = c.id
LEFT JOIN latest_debt ld ON ld.company_id = c.id
LEFT JOIN latest_preferred lp ON lp.company_id = c.id
LEFT JOIN latest_shares ls ON ls.company_id = c.id
LEFT JOIN latest_cash lc ON lc.company_id = c.id
LEFT JOIN latest_cost_basis lcb ON lcb.company_id = c.id;

COMMENT ON VIEW company_snapshot IS 'Current state of each company with provenance links to SEC filings';

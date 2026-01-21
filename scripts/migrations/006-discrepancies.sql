-- Discrepancies Table
-- Track when sources disagree with our current values
-- No staleness scoring - just facts: source, date, value

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE discrepancy_status AS ENUM ('pending', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE discrepancy_severity AS ENUM ('minor', 'moderate', 'major');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Fields we track discrepancies for
DO $$ BEGIN
  CREATE TYPE discrepancy_field AS ENUM (
    'holdings',
    'shares_outstanding',
    'debt',
    'cash',
    'preferred_equity'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- DISCREPANCIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS discrepancies (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,

  -- What field has the discrepancy
  field discrepancy_field NOT NULL,

  -- Our current value (from TypeScript file)
  our_value DECIMAL(20, 8) NOT NULL,

  -- What each source reports
  -- Format: {"source_name": {"value": 52911, "url": "https://...", "date": "2026-01-15"}}
  source_values JSONB NOT NULL,

  -- Severity based on % difference from our value
  -- minor: <1%, moderate: 1-5%, major: >5%
  severity discrepancy_severity NOT NULL,
  max_deviation_pct DECIMAL(10, 4),

  -- Status
  status discrepancy_status DEFAULT 'pending',

  -- Resolution (when status = 'resolved')
  resolved_value DECIMAL(20, 8),
  resolution_source VARCHAR(100),      -- Which source was correct
  resolution_notes TEXT,
  resolved_by VARCHAR(100),
  resolved_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_date DATE DEFAULT CURRENT_DATE
);

-- One discrepancy per company/field per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_discrepancies_unique_daily
  ON discrepancies(company_id, field, created_date);

-- Trigger to ensure created_date matches created_at
CREATE OR REPLACE FUNCTION set_created_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_date := DATE(NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_created_date ON discrepancies;
CREATE TRIGGER trg_set_created_date
  BEFORE INSERT ON discrepancies
  FOR EACH ROW EXECUTE FUNCTION set_created_date();

CREATE INDEX IF NOT EXISTS idx_discrepancies_status ON discrepancies(status);
CREATE INDEX IF NOT EXISTS idx_discrepancies_pending ON discrepancies(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_discrepancies_company ON discrepancies(company_id);
CREATE INDEX IF NOT EXISTS idx_discrepancies_created ON discrepancies(created_at DESC);

-- ============================================
-- FETCH RESULTS TABLE
-- ============================================
-- Record what each source reported when we checked
-- This is the raw data that feeds into discrepancy detection

CREATE TABLE IF NOT EXISTS fetch_results (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,

  -- What we fetched
  field discrepancy_field NOT NULL,
  value DECIMAL(20, 8) NOT NULL,

  -- Source attribution (just facts, no staleness)
  source_name VARCHAR(100) NOT NULL,   -- "mNAV.com", "SEC 8-K", "strategy.com", etc.
  source_url VARCHAR(1000),            -- Link to verify
  source_date DATE,                    -- When the source published this data

  -- When we fetched it
  fetched_at TIMESTAMPTZ DEFAULT NOW(),

  -- Optional: raw response for debugging
  raw_response JSONB
);

CREATE INDEX IF NOT EXISTS idx_fetch_results_company ON fetch_results(company_id);
CREATE INDEX IF NOT EXISTS idx_fetch_results_recent ON fetch_results(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_fetch_results_source ON fetch_results(source_name);

-- Cleanup: keep only last 30 days of fetch results
-- Run periodically: DELETE FROM fetch_results WHERE fetched_at < NOW() - INTERVAL '30 days';

-- ============================================
-- HELPER: Calculate severity from % deviation
-- ============================================

CREATE OR REPLACE FUNCTION calculate_severity(deviation_pct DECIMAL)
RETURNS discrepancy_severity AS $$
BEGIN
  IF ABS(deviation_pct) < 1 THEN
    RETURN 'minor';
  ELSIF ABS(deviation_pct) < 5 THEN
    RETURN 'moderate';
  ELSE
    RETURN 'major';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- HELPER: Create discrepancy if sources disagree
-- ============================================

CREATE OR REPLACE FUNCTION check_for_discrepancy(
  p_company_id INT,
  p_field discrepancy_field,
  p_our_value DECIMAL(20, 8),
  p_source_values JSONB  -- {"source": {"value": X, "url": "...", "date": "..."}}
) RETURNS INT AS $$
DECLARE
  v_source_record RECORD;
  v_max_deviation DECIMAL(10, 4) := 0;
  v_has_discrepancy BOOLEAN := FALSE;
  v_deviation DECIMAL(10, 4);
  v_discrepancy_id INT;
BEGIN
  -- Check each source for deviation from our value
  FOR v_source_record IN SELECT * FROM jsonb_each(p_source_values)
  LOOP
    v_deviation := ABS(
      ((v_source_record.value->>'value')::DECIMAL - p_our_value) / NULLIF(p_our_value, 0) * 100
    );

    IF v_deviation > 0 THEN
      v_has_discrepancy := TRUE;
      IF v_deviation > v_max_deviation THEN
        v_max_deviation := v_deviation;
      END IF;
    END IF;
  END LOOP;

  -- Create discrepancy record if any source disagrees
  IF v_has_discrepancy THEN
    INSERT INTO discrepancies (
      company_id, field, our_value, source_values,
      severity, max_deviation_pct
    ) VALUES (
      p_company_id, p_field, p_our_value, p_source_values,
      calculate_severity(v_max_deviation), v_max_deviation
    )
    ON CONFLICT (company_id, field, created_date)
    DO UPDATE SET
      our_value = EXCLUDED.our_value,
      source_values = EXCLUDED.source_values,
      severity = EXCLUDED.severity,
      max_deviation_pct = EXCLUDED.max_deviation_pct
    RETURNING id INTO v_discrepancy_id;

    RETURN v_discrepancy_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

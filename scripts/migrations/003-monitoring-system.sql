-- Monitoring System Tables
-- Run this migration to enable the automated holdings monitoring system

-- Trust level enum for data sources
DO $$ BEGIN
  CREATE TYPE source_trust_level AS ENUM ('official', 'verified', 'community', 'unverified');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update status enum for pending updates
DO $$ BEGIN
  CREATE TYPE update_status AS ENUM ('pending', 'approved', 'rejected', 'superseded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Social media and IR sources to monitor per company
CREATE TABLE IF NOT EXISTS social_sources (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  platform VARCHAR(50) NOT NULL,           -- 'twitter', 'ir_page', 'press_wire'
  account_handle VARCHAR(200) NOT NULL,    -- @MicroStrategy, URL, etc.
  account_type VARCHAR(50) DEFAULT 'official', -- 'official', 'analyst', 'news'
  trust_level source_trust_level DEFAULT 'community',
  keywords TEXT[],                          -- Keywords to filter relevant content
  is_active BOOLEAN DEFAULT TRUE,
  last_checked TIMESTAMPTZ,
  last_post_id VARCHAR(100),               -- For deduplication
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, platform, account_handle)
);

-- Pending updates queue (detected by monitoring, awaiting approval)
CREATE TABLE IF NOT EXISTS pending_updates (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  detected_holdings DECIMAL(20, 8) NOT NULL,
  detected_shares_outstanding DECIMAL(20, 0),
  previous_holdings DECIMAL(20, 8),
  confidence_score DECIMAL(5, 4) NOT NULL DEFAULT 0.5,
  source_type VARCHAR(50) NOT NULL,        -- 'sec_8k', 'twitter', 'ir_page', etc.
  source_url VARCHAR(1000),
  source_text TEXT,                        -- Raw text that was analyzed
  source_date TIMESTAMPTZ,                 -- Date of the source document
  trust_level source_trust_level NOT NULL,
  llm_model VARCHAR(100),                  -- Which model did the extraction
  llm_prompt_version VARCHAR(50),
  extraction_reasoning TEXT,               -- LLM's reasoning for extraction
  status update_status DEFAULT 'pending',
  auto_approved BOOLEAN DEFAULT FALSE,
  auto_approve_reason VARCHAR(500),
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  holdings_snapshot_id INT,                -- ID of snapshot created when approved
  monitoring_run_id INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monitoring run history (for audit and debugging)
CREATE TABLE IF NOT EXISTS monitoring_runs (
  id SERIAL PRIMARY KEY,
  run_type VARCHAR(50) NOT NULL,           -- 'hourly', 'daily', 'manual'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  status VARCHAR(50) DEFAULT 'running',    -- 'running', 'completed', 'failed'
  sources_checked INT DEFAULT 0,
  companies_checked INT DEFAULT 0,
  updates_detected INT DEFAULT 0,
  updates_auto_approved INT DEFAULT 0,
  updates_pending_review INT DEFAULT 0,
  notifications_sent INT DEFAULT 0,
  errors_count INT DEFAULT 0,
  run_log TEXT,
  error_details JSONB,
  source_stats JSONB                       -- Stats per source type
);

-- Notifications log (Discord, email, etc.)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  notification_type VARCHAR(50) NOT NULL,  -- 'holdings_update', 'stale_data', 'error'
  company_id INT,
  pending_update_id INT REFERENCES pending_updates(id),
  monitoring_run_id INT REFERENCES monitoring_runs(id),
  title VARCHAR(200) NOT NULL,
  message TEXT,
  embed_data JSONB,
  priority VARCHAR(20) DEFAULT 'normal',   -- 'low', 'normal', 'high', 'urgent'
  channel VARCHAR(50) NOT NULL,            -- 'discord', 'email', 'slack'
  webhook_url VARCHAR(500),
  delivered_at TIMESTAMPTZ,
  delivery_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  delivery_response JSONB,
  retry_count INT DEFAULT 0,
  dedup_key VARCHAR(100),                  -- For deduplication
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_updates_status ON pending_updates(status);
CREATE INDEX IF NOT EXISTS idx_pending_updates_company ON pending_updates(company_id);
CREATE INDEX IF NOT EXISTS idx_pending_updates_created ON pending_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_runs_started ON monitoring_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_sources_active ON social_sources(is_active, platform);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type, created_at DESC);

-- Stored procedure to approve a pending update and create holdings snapshot
DROP FUNCTION IF EXISTS approve_pending_update(INT, VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION approve_pending_update(
  p_update_id INT,
  p_reviewer VARCHAR(100),
  p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_update pending_updates%ROWTYPE;
  v_snapshot_id INT;
BEGIN
  -- Get the pending update
  SELECT * INTO v_update FROM pending_updates WHERE id = p_update_id;

  IF v_update IS NULL THEN
    RAISE EXCEPTION 'Pending update not found: %', p_update_id;
  END IF;

  IF v_update.status != 'pending' THEN
    RAISE EXCEPTION 'Update is not pending: %', v_update.status;
  END IF;

  -- Create holdings snapshot
  INSERT INTO holdings_snapshots (
    company_id,
    holdings,
    shares_outstanding,
    holdings_per_share,
    source,
    source_url,
    snapshot_date,
    status
  ) VALUES (
    v_update.company_id,
    v_update.detected_holdings,
    v_update.detected_shares_outstanding,
    CASE
      WHEN v_update.detected_shares_outstanding > 0
      THEN v_update.detected_holdings / v_update.detected_shares_outstanding
      ELSE NULL
    END,
    v_update.source_type,
    v_update.source_url,
    COALESCE(v_update.source_date::DATE, NOW()::DATE),
    'approved'
  ) RETURNING id INTO v_snapshot_id;

  -- Update the pending_updates record
  UPDATE pending_updates SET
    status = 'approved',
    reviewed_by = p_reviewer,
    reviewed_at = NOW(),
    review_notes = p_notes,
    holdings_snapshot_id = v_snapshot_id,
    updated_at = NOW()
  WHERE id = p_update_id;

  -- Supersede any older pending updates for the same company
  UPDATE pending_updates SET
    status = 'superseded',
    updated_at = NOW()
  WHERE company_id = v_update.company_id
    AND id != p_update_id
    AND status = 'pending'
    AND created_at < v_update.created_at;

END;
$$ LANGUAGE plpgsql;

-- Seed initial social sources for major companies
INSERT INTO social_sources (company_id, platform, account_handle, account_type, trust_level, keywords)
SELECT
  id,
  'twitter',
  CASE ticker
    WHEN 'MSTR' THEN '@Strategy'
    WHEN 'MARA' THEN '@MARAHoldings'
    WHEN 'RIOT' THEN '@RiotPlatforms'
    WHEN 'CLSK' THEN '@CleanSpark_Inc'
    WHEN 'ASST' THEN '@strikigroup'
    WHEN 'KULR' THEN '@KULRTech'
    WHEN 'DJT' THEN '@truthsocial'
    ELSE NULL
  END,
  'official',
  'verified',
  ARRAY['bitcoin', 'btc', 'holdings', 'treasury', 'acquired', 'purchased']
FROM companies
WHERE ticker IN ('MSTR', 'MARA', 'RIOT', 'CLSK', 'ASST', 'KULR', 'DJT')
ON CONFLICT DO NOTHING;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL ON pending_updates TO your_app_user;
-- GRANT ALL ON monitoring_runs TO your_app_user;
-- GRANT ALL ON social_sources TO your_app_user;
-- GRANT ALL ON notifications TO your_app_user;

// Monitoring System Migration
// Run with: node scripts/migrate-monitoring.mjs

import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://postgres:mrxFcPGKlmiEZjhhUHhigixHtqBHaKBF@gondola.proxy.rlwy.net:10200/railway';

const MIGRATION_SQL = `
-- ============================================
-- MONITORING SYSTEM TABLES
-- Version 1.0 - Automated Holdings Monitoring
-- ============================================

-- Trust level for data sources
DO $$ BEGIN
  CREATE TYPE source_trust_level AS ENUM (
    'official',      -- SEC filings, official IR pages (auto-approve)
    'verified',      -- Known reliable third parties (auto-approve with threshold)
    'community',     -- Twitter analysts, news (requires approval)
    'unverified'     -- New/unknown sources (requires approval)
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add trust_level to data_sources if not exists
DO $$ BEGIN
  ALTER TABLE data_sources ADD COLUMN trust_level source_trust_level DEFAULT 'verified';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE data_sources ADD COLUMN auto_approve_threshold DECIMAL(5, 4) DEFAULT 0.90;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Add check frequency to company_sources if not exists
DO $$ BEGIN
  ALTER TABLE company_sources ADD COLUMN check_frequency_hours INT DEFAULT 24;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE company_sources ADD COLUMN last_check_at TIMESTAMPTZ;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE company_sources ADD COLUMN next_check_at TIMESTAMPTZ;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Social media monitoring sources
CREATE TABLE IF NOT EXISTS social_sources (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,

  platform VARCHAR(50) NOT NULL,           -- 'twitter', 'discord', 'telegram'
  account_handle VARCHAR(200) NOT NULL,    -- @MicroStrategy, @saboringcompany
  account_type VARCHAR(50) NOT NULL,       -- 'official', 'analyst', 'news'
  trust_level source_trust_level DEFAULT 'community',

  -- Monitoring config
  keywords TEXT[],                         -- Additional keywords to filter for
  is_active BOOLEAN DEFAULT TRUE,

  -- Tracking
  last_checked TIMESTAMPTZ,
  last_post_id VARCHAR(100),               -- For pagination/deduplication

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, platform, account_handle)
);

CREATE INDEX IF NOT EXISTS idx_social_sources_company ON social_sources(company_id);
CREATE INDEX IF NOT EXISTS idx_social_sources_platform ON social_sources(platform);
CREATE INDEX IF NOT EXISTS idx_social_sources_active ON social_sources(is_active);

-- Pending updates queue (detected by monitoring agent)
CREATE TABLE IF NOT EXISTS pending_updates (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,

  -- Detected data
  detected_holdings DECIMAL(20, 8),
  detected_shares_outstanding DECIMAL(20, 0),
  previous_holdings DECIMAL(20, 8),        -- For comparison

  -- Confidence scoring
  confidence_score DECIMAL(5, 4),          -- 0.0 to 1.0 from LLM

  -- Source information
  source_type VARCHAR(50) NOT NULL,        -- 'sec_8k', 'twitter', 'ir_page', 'btc_treasuries'
  source_url VARCHAR(1000),
  source_text TEXT,                        -- Raw text extracted
  source_date TIMESTAMPTZ,                 -- Date mentioned in source
  trust_level source_trust_level NOT NULL,

  -- LLM extraction details
  llm_model VARCHAR(100),
  llm_prompt_version VARCHAR(20),          -- For tracking prompt changes
  extraction_reasoning TEXT,               -- LLM's explanation

  -- Review workflow
  status VARCHAR(20) DEFAULT 'pending',    -- 'pending', 'approved', 'rejected', 'superseded'
  auto_approved BOOLEAN DEFAULT FALSE,
  auto_approve_reason TEXT,

  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- If approved, link to created snapshot
  holdings_snapshot_id INT REFERENCES holdings_snapshots(id),

  -- Monitoring run reference
  monitoring_run_id INT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_updates_status ON pending_updates(status);
CREATE INDEX IF NOT EXISTS idx_pending_updates_company ON pending_updates(company_id);
CREATE INDEX IF NOT EXISTS idx_pending_updates_trust ON pending_updates(trust_level);
CREATE INDEX IF NOT EXISTS idx_pending_updates_created ON pending_updates(created_at DESC);

-- Monitoring agent run history
CREATE TABLE IF NOT EXISTS monitoring_runs (
  id SERIAL PRIMARY KEY,
  run_type VARCHAR(50) NOT NULL,           -- 'hourly', 'daily', 'manual'

  -- Timing
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_ms INT,

  -- Status
  status VARCHAR(50) DEFAULT 'running',    -- 'running', 'completed', 'failed'

  -- Statistics
  sources_checked INT DEFAULT 0,
  companies_checked INT DEFAULT 0,
  updates_detected INT DEFAULT 0,
  updates_auto_approved INT DEFAULT 0,
  updates_pending_review INT DEFAULT 0,
  notifications_sent INT DEFAULT 0,
  errors_count INT DEFAULT 0,

  -- Details
  run_log TEXT,
  error_details JSONB,
  source_stats JSONB,                      -- Per-source breakdown

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_runs_status ON monitoring_runs(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_runs_started ON monitoring_runs(started_at DESC);

-- Notification history
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,

  notification_type VARCHAR(50) NOT NULL,  -- 'holdings_update', 'stale_data', 'discrepancy', 'error'
  company_id INT REFERENCES companies(id),
  pending_update_id INT REFERENCES pending_updates(id),
  monitoring_run_id INT REFERENCES monitoring_runs(id),

  -- Content
  title VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  embed_data JSONB,                        -- Discord embed structure
  priority VARCHAR(20) DEFAULT 'normal',   -- 'low', 'normal', 'high', 'urgent'

  -- Delivery
  channel VARCHAR(50) NOT NULL,            -- 'discord', 'email', 'slack'
  webhook_url VARCHAR(500),

  delivered_at TIMESTAMPTZ,
  delivery_status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'sent', 'failed'
  delivery_response JSONB,
  retry_count INT DEFAULT 0,

  -- Deduplication
  dedup_key VARCHAR(200),                  -- Prevent duplicate notifications

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notifications_dedup ON notifications(dedup_key);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Add foreign key for monitoring_run_id in pending_updates
DO $$ BEGIN
  ALTER TABLE pending_updates
  ADD CONSTRAINT fk_pending_updates_run
  FOREIGN KEY (monitoring_run_id) REFERENCES monitoring_runs(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_monitoring_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_social_sources_timestamp ON social_sources;
CREATE TRIGGER trigger_social_sources_timestamp
BEFORE UPDATE ON social_sources
FOR EACH ROW EXECUTE FUNCTION update_monitoring_timestamp();

DROP TRIGGER IF EXISTS trigger_pending_updates_timestamp ON pending_updates;
CREATE TRIGGER trigger_pending_updates_timestamp
BEFORE UPDATE ON pending_updates
FOR EACH ROW EXECUTE FUNCTION update_monitoring_timestamp();

-- Function to auto-approve pending update and create holdings snapshot
CREATE OR REPLACE FUNCTION approve_pending_update(
  p_update_id INT,
  p_reviewer VARCHAR(100) DEFAULT 'system',
  p_notes TEXT DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
  v_update RECORD;
  v_snapshot_id INT;
BEGIN
  -- Get the pending update
  SELECT * INTO v_update FROM pending_updates WHERE id = p_update_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending update not found or already processed';
  END IF;

  -- Create holdings snapshot
  INSERT INTO holdings_snapshots (
    company_id,
    holdings,
    source,
    source_url,
    snapshot_date,
    status,
    reviewed_by,
    reviewed_at,
    review_notes
  ) VALUES (
    v_update.company_id,
    v_update.detected_holdings,
    CASE v_update.source_type
      WHEN 'sec_8k' THEN '8-K filing'::holdings_source
      WHEN 'sec_10q' THEN '10-Q filing'::holdings_source
      WHEN 'sec_10k' THEN '10-K filing'::holdings_source
      WHEN 'twitter' THEN 'manual'::holdings_source
      WHEN 'btc_treasuries' THEN 'bitcointreasuries.net'::holdings_source
      WHEN 'ir_page' THEN 'company website'::holdings_source
      ELSE 'api'::holdings_source
    END,
    v_update.source_url,
    COALESCE(v_update.source_date::date, CURRENT_DATE),
    'approved',
    p_reviewer,
    NOW(),
    p_notes
  ) RETURNING id INTO v_snapshot_id;

  -- Update pending_update status
  UPDATE pending_updates
  SET
    status = 'approved',
    reviewed_by = p_reviewer,
    reviewed_at = NOW(),
    review_notes = p_notes,
    holdings_snapshot_id = v_snapshot_id
  WHERE id = p_update_id;

  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql;

-- View for pending updates with company info
CREATE OR REPLACE VIEW v_pending_updates AS
SELECT
  pu.id,
  pu.company_id,
  c.name as company_name,
  c.ticker,
  a.symbol as asset,
  c.current_holdings,
  pu.detected_holdings,
  pu.previous_holdings,
  CASE
    WHEN c.current_holdings > 0
    THEN ((pu.detected_holdings - c.current_holdings) / c.current_holdings * 100)
    ELSE NULL
  END as change_pct,
  pu.confidence_score,
  pu.source_type,
  pu.source_url,
  pu.trust_level,
  pu.extraction_reasoning,
  pu.status,
  pu.auto_approved,
  pu.auto_approve_reason,
  pu.created_at
FROM pending_updates pu
JOIN companies c ON pu.company_id = c.id
JOIN assets a ON c.asset_id = a.id
ORDER BY pu.created_at DESC;

-- View for monitoring run summary
CREATE OR REPLACE VIEW v_monitoring_summary AS
SELECT
  mr.id,
  mr.run_type,
  mr.started_at,
  mr.completed_at,
  mr.duration_ms,
  mr.status,
  mr.sources_checked,
  mr.companies_checked,
  mr.updates_detected,
  mr.updates_auto_approved,
  mr.updates_pending_review,
  mr.notifications_sent,
  mr.errors_count,
  (SELECT COUNT(*) FROM pending_updates WHERE status = 'pending') as total_pending
FROM monitoring_runs mr
ORDER BY mr.started_at DESC;
`;

async function migrate() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: false
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!\n');

    console.log('Running monitoring system migration...\n');

    // Execute the full migration as a single transaction
    await client.query('BEGIN');

    try {
      await client.query(MIGRATION_SQL);
      await client.query('COMMIT');
      console.log('Migration completed successfully!\n');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    // Verify tables were created
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('social_sources', 'pending_updates', 'monitoring_runs', 'notifications')
      ORDER BY table_name
    `);

    console.log('Monitoring tables created:');
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));

    // Check for new type
    const types = await client.query(`
      SELECT typname FROM pg_type
      WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND typname = 'source_trust_level'
    `);

    if (types.rows.length > 0) {
      console.log('\nCustom types:');
      console.log('  - source_trust_level');
    }

    // Show pending_updates count
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM pending_updates) as pending_updates,
        (SELECT COUNT(*) FROM monitoring_runs) as monitoring_runs,
        (SELECT COUNT(*) FROM social_sources) as social_sources,
        (SELECT COUNT(*) FROM notifications) as notifications
    `);

    console.log('\nTable row counts:');
    console.log(`  - pending_updates: ${counts.rows[0].pending_updates}`);
    console.log(`  - monitoring_runs: ${counts.rows[0].monitoring_runs}`);
    console.log(`  - social_sources: ${counts.rows[0].social_sources}`);
    console.log(`  - notifications: ${counts.rows[0].notifications}`);

  } catch (err) {
    console.error('Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();

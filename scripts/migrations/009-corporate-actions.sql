-- 009-corporate-actions.sql
-- Adds corporate action events (splits/consolidations) for split-proof normalization

CREATE TABLE IF NOT EXISTS corporate_actions (
  action_id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  action_type TEXT NOT NULL, -- e.g. split, reverse_split, consolidation, subdivision
  ratio REAL NOT NULL,       -- multiplier applied to shares at effective_date going forward in time
  effective_date TEXT NOT NULL, -- YYYY-MM-DD
  source_artifact_id TEXT,   -- nullable
  source_url TEXT,           -- nullable
  quote TEXT,                -- nullable
  confidence REAL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_corporate_actions_entity_date
  ON corporate_actions(entity_id, effective_date);

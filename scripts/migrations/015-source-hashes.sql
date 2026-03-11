-- Source content hashes for change detection (Phase 4.2)
-- Tracks content fingerprints for company dashboards and IR pages
-- so the source-monitor cron can detect when pages update.

CREATE TABLE IF NOT EXISTS source_hashes (
  url TEXT PRIMARY KEY,
  ticker TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('dashboard', 'ir_page')),
  content_hash TEXT NOT NULL,
  content_snippet TEXT,          -- First ~200 chars of extracted text (for debugging)
  last_checked TEXT NOT NULL,    -- ISO 8601
  last_changed TEXT,             -- ISO 8601 (when hash last differed)
  check_count INTEGER DEFAULT 1,
  consecutive_failures INTEGER DEFAULT 0,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_source_hashes_ticker ON source_hashes(ticker);
CREATE INDEX IF NOT EXISTS idx_source_hashes_changed ON source_hashes(last_changed);

-- 011: Adoption events table
-- Lightweight event sink for measuring product adoption.
-- All columns are TEXT (D1/SQLite); meta is a JSON string.

CREATE TABLE IF NOT EXISTS adoption_events (
  id         TEXT PRIMARY KEY,
  ts         TEXT NOT NULL,
  event      TEXT NOT NULL,
  client     TEXT NOT NULL DEFAULT 'unknown',
  session_id TEXT NOT NULL,
  route      TEXT,
  ticker     TEXT,
  metric     TEXT,
  datapoint_id TEXT,
  artifact_id  TEXT,
  run_id       TEXT,
  meta       TEXT
);

-- Query patterns: events in a time range, by type, by company, by metric
CREATE INDEX IF NOT EXISTS idx_ae_event_ts
  ON adoption_events(event, ts);

CREATE INDEX IF NOT EXISTS idx_ae_ticker_ts
  ON adoption_events(ticker, ts);

CREATE INDEX IF NOT EXISTS idx_ae_metric_ts
  ON adoption_events(metric, ts);

CREATE INDEX IF NOT EXISTS idx_ae_session_ts
  ON adoption_events(session_id, ts);

-- TODO(retention): prune old rows periodically (e.g., keep 90d)
-- DELETE FROM adoption_events WHERE ts < datetime('now', '-90 day');

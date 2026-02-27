-- Phase 10d: datapoint_verifications
-- Stores automated/manual verification results for datapoints without mutating datapoints rows.

CREATE TABLE IF NOT EXISTS datapoint_verifications (
  verification_id TEXT PRIMARY KEY,
  datapoint_id TEXT NOT NULL,

  -- pass|warn|fail
  verdict TEXT NOT NULL,

  -- JSON array of check results, e.g. [{name, status, details}]
  checks_json TEXT NOT NULL,

  checked_at TEXT NOT NULL,

  -- e.g. auto|manual
  verifier TEXT NOT NULL,

  -- Git SHA of verifier code
  code_sha TEXT,

  FOREIGN KEY (datapoint_id) REFERENCES datapoints(datapoint_id)
);

CREATE INDEX IF NOT EXISTS idx_dpv_datapoint_id_checked_at
  ON datapoint_verifications(datapoint_id, checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_dpv_verdict_checked_at
  ON datapoint_verifications(verdict, checked_at DESC);

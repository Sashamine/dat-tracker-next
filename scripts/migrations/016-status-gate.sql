-- Migration 016: Status-gated latest_datapoints view
--
-- Problem: The latest_datapoints VIEW returns all datapoints regardless of status.
-- This means 'candidate' proposals from auto-extraction appear live on the site
-- before anyone reviews them, and 'rejected' proposals also appear.
--
-- Fix:
-- 1. Bulk-approve all existing datapoints (they've been live for months)
-- 2. Update the VIEW to only include 'approved' rows
--
-- After this migration:
-- - XBRL cron and foreign pipeline write as 'approved' (trusted sources)
-- - Auto-extract proposals start as 'candidate', auto-approved at ≥90% confidence
-- - Only 'approved' datapoints appear in the D1 overlay (site display)

BEGIN TRANSACTION;

-- 1. Bulk-approve all existing datapoints (candidate, needs_review, etc.)
-- These have been live on the site via the old unfiltered VIEW for months.
UPDATE datapoints
SET status = 'approved'
WHERE status != 'approved' AND status != 'rejected';

-- 2. Recreate latest_datapoints VIEW with status filter
DROP VIEW IF EXISTS latest_datapoints;

CREATE VIEW latest_datapoints AS
SELECT * FROM (
  SELECT *, ROW_NUMBER() OVER (
    PARTITION BY entity_id, metric
    ORDER BY as_of DESC, reported_at DESC, created_at DESC
  ) as rn
  FROM datapoints
  WHERE status = 'approved'
) WHERE rn = 1;

COMMIT;

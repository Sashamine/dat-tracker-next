-- 1) Delete duplicate corporate actions, keeping the earliest created_at row
-- Duplicates defined by (entity_id, action_type, ratio, effective_date)
DELETE FROM corporate_actions
WHERE action_id NOT IN (
  SELECT action_id FROM (
    SELECT
      action_id,
      ROW_NUMBER() OVER (
        PARTITION BY entity_id, action_type, ratio, effective_date
        ORDER BY datetime(created_at) ASC
      ) AS rn
    FROM corporate_actions
  ) ranked
  WHERE rn = 1
);

-- 2) Add unique index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_corporate_actions_nk
ON corporate_actions(entity_id, action_type, ratio, effective_date);

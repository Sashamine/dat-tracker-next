-- Merge near-duplicate corporate actions where the same (entity_id, action_type, ratio)
-- occurs within +/- 1 day. Keep the earliest effective_date.
--
-- This is useful for timezone/wording drift (e.g. "effective July 1" vs "5pm ET June 30").

-- 1) Find and delete the later-dated duplicates.
DELETE FROM corporate_actions
WHERE action_id IN (
  SELECT action_id FROM (
    SELECT
      ca.action_id,
      ca.entity_id,
      ca.action_type,
      ca.ratio,
      ca.effective_date,
      MIN(ca2.effective_date) OVER (
        PARTITION BY ca.entity_id, ca.action_type, ca.ratio
      ) AS min_date,
      -- For each row, find if there's an earlier row within 1 day for same key
      EXISTS (
        SELECT 1
        FROM corporate_actions earlier
        WHERE earlier.entity_id = ca.entity_id
          AND earlier.action_type = ca.action_type
          AND earlier.ratio = ca.ratio
          AND earlier.effective_date < ca.effective_date
          AND ABS(julianday(ca.effective_date) - julianday(earlier.effective_date)) <= 1
      ) AS has_earlier_within_1d
    FROM corporate_actions ca
    JOIN corporate_actions ca2
      ON ca2.entity_id = ca.entity_id
     AND ca2.action_type = ca.action_type
     AND ca2.ratio = ca.ratio
  ) t
  WHERE t.has_earlier_within_1d = 1
);

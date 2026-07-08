-- Track when a lead entered its current pipeline stage (independent of updated_at).

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS status_entered_at timestamptz NOT NULL DEFAULT now();

-- Backfill: last stage move from activity log, else created_at.
UPDATE leads l
SET status_entered_at = sub.entered
FROM (
  SELECT
    l2.id,
    COALESCE(
      (
        SELECT MAX(la.created_at)
        FROM lead_activity la
        WHERE la.lead_id = l2.id
          AND la.description LIKE 'Moved from%'
      ),
      l2.created_at
    ) AS entered
  FROM leads l2
) sub
WHERE l.id = sub.id;

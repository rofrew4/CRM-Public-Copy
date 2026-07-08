-- Follow-up system: new columns, pipeline stages, RPC helpers

ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_followup_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_followup_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_count integer NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_cadence_days integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS noshow_count integer NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS awaiting_response_since timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS closed_reason text;

-- Drop status check before migrating rows to new status values
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

UPDATE leads SET closed_reason = 'won'
WHERE status = 'closed_won' AND closed_reason IS NULL;

UPDATE leads SET closed_reason = 'non_fit'
WHERE status = 'non_fit' AND closed_reason IS NULL;

UPDATE leads SET closed_reason = 'ghosted'
WHERE status = 'closed_lost' AND close_lost_reason = 'ghosted' AND closed_reason IS NULL;

UPDATE leads SET closed_reason = 'lost'
WHERE status = 'closed_lost' AND closed_reason IS NULL;

UPDATE leads SET status = 'closed'
WHERE status IN ('closed_won', 'closed_lost', 'non_fit');

ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (
  status IN (
    'responded',
    'meeting_requested',
    'meeting_booked',
    'meeting_taken',
    '2nd_call_booked',
    'proposal_sent',
    'closed'
  )
);

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_closed_reason_check;
ALTER TABLE leads ADD CONSTRAINT leads_closed_reason_check CHECK (
  closed_reason IS NULL OR closed_reason IN ('won', 'lost', 'non_fit', 'ghosted')
);

CREATE OR REPLACE FUNCTION log_followup(p_lead_id uuid)
RETURNS SETOF leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cadence integer;
BEGIN
  SELECT COALESCE(followup_cadence_days, 3) INTO v_cadence
  FROM leads WHERE id = p_lead_id;

  RETURN QUERY
  UPDATE leads SET
    last_followup_at = now(),
    next_followup_at = now() + (v_cadence || ' days')::interval,
    followup_count = followup_count + 1,
    awaiting_response_since = now()
  WHERE id = p_lead_id
  RETURNING *;

  INSERT INTO lead_activity (lead_id, activity_type, description)
  VALUES (p_lead_id, 'followup', 'Followed up');
END;
$$;

CREATE OR REPLACE FUNCTION log_noshow(p_lead_id uuid)
RETURNS SETOF leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE leads SET
    noshow_count = 1,
    next_followup_at = now() + interval '2 days'
  WHERE id = p_lead_id
  RETURNING *;

  INSERT INTO lead_activity (lead_id, activity_type, description)
  VALUES (p_lead_id, 'noshow', 'No-show logged');
END;
$$;

GRANT EXECUTE ON FUNCTION log_followup(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_noshow(uuid) TO anon, authenticated;

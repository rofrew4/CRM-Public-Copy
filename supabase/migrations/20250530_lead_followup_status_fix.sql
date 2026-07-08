-- Fix: run this if 20250529 failed on leads_status_check (constraint blocked status = 'closed')

ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_followup_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_followup_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_count integer NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_cadence_days integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS noshow_count integer NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS awaiting_response_since timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS closed_reason text;

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

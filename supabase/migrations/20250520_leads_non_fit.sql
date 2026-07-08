-- Add non_fit lead status (run in Supabase SQL Editor if not using CLI migrations)

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (
  status IN (
    'responded',
    'meeting_requested',
    'meeting_booked',
    'meeting_taken',
    '2nd_call_booked',
    'closed_won',
    'closed_lost',
    'non_fit'
  )
);

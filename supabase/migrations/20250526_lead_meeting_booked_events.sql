-- First time each lead enters "meeting booked" (never double-counted per lead)

CREATE TABLE IF NOT EXISTS lead_meeting_booked_events (
  lead_id uuid PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  booked_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_meeting_booked_events_booked_on_idx
  ON lead_meeting_booked_events (booked_on);

ALTER TABLE lead_meeting_booked_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on lead_meeting_booked_events" ON lead_meeting_booked_events;
CREATE POLICY "Allow all on lead_meeting_booked_events"
  ON lead_meeting_booked_events FOR ALL
  USING (true) WITH CHECK (true);

-- Backfill: earliest "moved to Meeting Booked" per lead (one row each)
INSERT INTO lead_meeting_booked_events (lead_id, booked_on)
SELECT DISTINCT ON (lead_id)
  lead_id,
  created_at::date
FROM lead_activity
WHERE description LIKE '%to Meeting Booked%'
ORDER BY lead_id, created_at ASC
ON CONFLICT (lead_id) DO NOTHING;

INSERT INTO lead_meeting_booked_events (lead_id, booked_on)
SELECT
  l.id,
  l.updated_at::date
FROM leads l
WHERE l.status IN (
  'meeting_booked',
  'meeting_taken',
  '2nd_call_booked',
  'closed_won'
)
AND NOT EXISTS (
  SELECT 1 FROM lead_meeting_booked_events e WHERE e.lead_id = l.id
);

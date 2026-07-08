-- Re-run backfill for demo bookings (safe to run multiple times)

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

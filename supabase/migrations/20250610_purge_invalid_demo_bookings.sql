-- Remove demo booking rows for leads that never entered Meeting Booked.

DELETE FROM lead_meeting_booked_events e
WHERE NOT EXISTS (
  SELECT 1
  FROM lead_activity la
  WHERE la.lead_id = e.lead_id
    AND la.description LIKE '%to Meeting Booked%'
);

-- Restore booked_on from earliest activity where it drifted.
UPDATE lead_meeting_booked_events e
SET booked_on = sub.activity_date
FROM (
  SELECT DISTINCT ON (lead_id)
    lead_id,
    created_at::date AS activity_date
  FROM lead_activity
  WHERE description LIKE '%to Meeting Booked%'
  ORDER BY lead_id, created_at ASC
) sub
WHERE e.lead_id = sub.lead_id
  AND e.booked_on IS DISTINCT FROM sub.activity_date;

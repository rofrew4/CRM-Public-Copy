-- Proposal tracking on 2nd Call Booked leads

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS proposal_made boolean NOT NULL DEFAULT false;

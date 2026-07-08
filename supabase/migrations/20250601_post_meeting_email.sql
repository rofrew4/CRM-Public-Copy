ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS post_meeting_email_sent boolean NOT NULL DEFAULT false;

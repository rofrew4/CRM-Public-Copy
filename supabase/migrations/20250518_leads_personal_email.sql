-- Run in Supabase SQL Editor if not using migrations CLI

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS personal_email_account_id uuid
  REFERENCES email_accounts(id) ON DELETE SET NULL;

COMMENT ON COLUMN leads.personal_email_account_id IS
  'Inbox used for personal outreach with this lead.';

CREATE INDEX IF NOT EXISTS leads_personal_email_account_id_idx
  ON leads(personal_email_account_id);

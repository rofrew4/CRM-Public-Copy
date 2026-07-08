ALTER TABLE email_accounts
  ADD COLUMN IF NOT EXISTS inbox_use text NOT NULL DEFAULT 'personal'
  CHECK (inbox_use IN ('personal', 'instantly', 'smartlead'));

COMMENT ON COLUMN email_accounts.inbox_use IS
  'Which sending platform this inbox is used for.';

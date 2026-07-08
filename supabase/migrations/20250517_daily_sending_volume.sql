-- Run in Supabase SQL Editor if not using migrations CLI

ALTER TABLE email_accounts
  ADD COLUMN IF NOT EXISTS daily_volume integer DEFAULT 0;

COMMENT ON COLUMN email_accounts.daily_volume IS
  'Target emails per day for this inbox (sending capacity).';

CREATE TABLE IF NOT EXISTS daily_sending_volume (
  log_date date PRIMARY KEY,
  total_volume integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE daily_sending_volume IS
  'End-of-day snapshot: sum of all inbox daily_volume values. Updated whenever volumes change; only the log_date = today row is overwritten.';

ALTER TABLE daily_sending_volume ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on daily_sending_volume" ON daily_sending_volume;
CREATE POLICY "Allow all on daily_sending_volume"
  ON daily_sending_volume FOR ALL
  USING (true) WITH CHECK (true);

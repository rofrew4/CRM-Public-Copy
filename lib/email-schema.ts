import { supabase } from "@/lib/supabase";

/** Paste into Supabase Dashboard → SQL Editor → Run */
export const EMAIL_VOLUME_SETUP_SQL = `-- Daily volume on email accounts + history table
ALTER TABLE email_accounts
  ADD COLUMN IF NOT EXISTS daily_volume integer DEFAULT 0;

ALTER TABLE email_accounts
  ADD COLUMN IF NOT EXISTS inbox_use text NOT NULL DEFAULT 'personal'
  CHECK (inbox_use IN ('personal', 'instantly', 'smartlead'));

CREATE TABLE IF NOT EXISTS daily_sending_volume (
  log_date date PRIMARY KEY,
  total_volume integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE daily_sending_volume ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on daily_sending_volume" ON daily_sending_volume;
CREATE POLICY "Allow all on daily_sending_volume"
  ON daily_sending_volume FOR ALL
  USING (true) WITH CHECK (true);`;

export function isMissingDailyVolumeError(message: string): boolean {
  return /daily_volume/i.test(message) && /schema cache|column|does not exist/i.test(message);
}

export async function probeEmailVolumeSchema(): Promise<{
  hasDailyVolumeColumn: boolean;
  hasDailySendingVolumeTable: boolean;
}> {
  const [col, table] = await Promise.all([
    supabase.from("email_accounts").select("daily_volume").limit(1),
    supabase.from("daily_sending_volume").select("log_date").limit(1),
  ]);

  return {
    hasDailyVolumeColumn: !col.error,
    hasDailySendingVolumeTable: !table.error,
  };
}

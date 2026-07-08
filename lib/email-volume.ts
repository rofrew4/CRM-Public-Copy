import { format, getDay, parseISO, startOfDay, subDays } from "date-fns";
import { supabase } from "@/lib/supabase";
import type { DailySendingVolume, EmailAccount } from "@/lib/types";

export type { DailySendingVolume };

export function sumAccountDailyVolume(accounts: EmailAccount[]): number {
  return accounts.reduce((sum, a) => {
    const v = a.daily_volume;
    const n =
      typeof v === "number" ? v : v != null ? parseFloat(String(v)) : 0;
    return sum + (Number.isFinite(n) ? Math.max(0, n) : 0);
  }, 0);
}

/** Saturday (6) and Sunday (0) in local time. */
export function isWeekend(date: Date = new Date()): boolean {
  const day = getDay(date);
  return day === 0 || day === 6;
}

export function isWeekendLogDate(logDate: string): boolean {
  const key = logDate.slice(0, 10);
  return isWeekend(parseISO(`${key}T12:00:00`));
}

/** Weekday capacity total; 0 on Sat/Sun for analytics display. */
export function sumAccountDailyVolumeForAnalytics(
  accounts: EmailAccount[]
): number {
  if (isWeekend()) return 0;
  return sumAccountDailyVolume(accounts);
}

/** Local calendar date (yyyy-MM-dd) for daily log keys. */
export function todayLogDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Records today's total sending capacity across all inboxes.
 * Overwrites only today's row — mid-day edits update today until midnight,
 * so the last value set each day is what history stores for that date.
 */
export async function recordTodaySendingVolume(
  accounts: EmailAccount[]
): Promise<string | null> {
  if (isWeekend()) return null;

  const total = sumAccountDailyVolume(accounts);
  const { error } = await supabase.from("daily_sending_volume").upsert(
    {
      log_date: todayLogDate(),
      total_volume: total,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "log_date" }
  );
  return error?.message ?? null;
}

export async function fetchDailyVolumeHistory(
  days = 30
): Promise<DailySendingVolume[]> {
  const since = format(subDays(startOfDay(new Date()), days - 1), "yyyy-MM-dd");
  const { data, error } = await supabase
    .from("daily_sending_volume")
    .select("*")
    .gte("log_date", since)
    .order("log_date", { ascending: true });

  if (error) return [];
  return (data ?? []) as DailySendingVolume[];
}

export function dailyVolumeChartData(
  history: DailySendingVolume[],
  days = 30
): { date: string; volume: number }[] {
  const byDate = new Map(
    history.map((h) => [h.log_date.slice(0, 10), h.total_volume])
  );
  const result: { date: string; volume: number }[] = [];
  const today = startOfDay(new Date());

  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(today, i);
    const key = format(d, "yyyy-MM-dd");
    result.push({
      date: format(d, "MMM d"),
      volume: isWeekend(d) ? 0 : (byDate.get(key) ?? 0),
    });
  }
  return result;
}

export async function updateAccountDailyVolume(
  accountId: string,
  dailyVolume: number,
  accounts: EmailAccount[]
): Promise<{ accounts: EmailAccount[]; logError: string | null }> {
  const { error } = await supabase
    .from("email_accounts")
    .update({ daily_volume: dailyVolume })
    .eq("id", accountId);

  if (error) {
    return { accounts, logError: error.message };
  }

  const updated = accounts.map((a) =>
    a.id === accountId ? { ...a, daily_volume: dailyVolume } : a
  );
  const logError = isWeekend()
    ? null
    : await recordTodaySendingVolume(updated);
  return { accounts: updated, logError };
}

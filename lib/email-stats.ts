import type { EmailAccount } from "@/lib/types";

/** PostgREST may return numeric columns as strings. */
export function parseMonthlyCost(
  value: number | string | null | undefined
): number {
  if (value == null || value === "") return 0;
  const n =
    typeof value === "number"
      ? value
      : parseFloat(String(value).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function parseDailyVolume(
  value: number | string | null | undefined
): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function sumMonthlyCost(
  accounts: EmailAccount[],
  options?: { activeOnly?: boolean }
): number {
  let list = accounts;
  if (options?.activeOnly) {
    list = list.filter((a) => a.status === "active");
  }
  return list.reduce((sum, a) => sum + parseMonthlyCost(a.monthly_cost), 0);
}

export function sumDailyVolume(accounts: EmailAccount[]): number {
  return accounts.reduce((sum, a) => sum + parseDailyVolume(a.daily_volume), 0);
}

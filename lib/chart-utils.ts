import { isWeekendLogDate } from "@/lib/email-volume";

export const WEEKEND_BAR_FILL = "#e5e7eb";

export function barFillForLogDate(iso: string, weekdayFill: string): string {
  return isWeekendLogDate(iso) ? WEEKEND_BAR_FILL : weekdayFill;
}

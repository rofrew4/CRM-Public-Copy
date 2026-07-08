/** Supabase PostgREST max rows per request. */
export const SUPABASE_PAGE_SIZE = 1000;

/** Show a performance heads-up on Leads when at or above this count. */
export const LEADS_SCALE_WARN = 200;

/** Show a performance heads-up on Contacts when at or above this count. */
export const CONTACTS_SCALE_WARN = 2000;

export type ScaleNoticeLevel = "info" | "warn";

export function leadsScaleNotice(
  count: number,
  loadedPages?: number
): { level: ScaleNoticeLevel; message: string } | null {
  if (count >= SUPABASE_PAGE_SIZE && loadedPages && loadedPages >= 1) {
    return {
      level: "warn",
      message: `${count}+ leads loaded. Supabase returns at most ${SUPABASE_PAGE_SIZE} rows per request — counts and board data may be incomplete past that. Consider archiving old leads.`,
    };
  }
  if (count >= LEADS_SCALE_WARN) {
    return {
      level: "info",
      message: `${count} leads on the board — drag and search may feel slower above ~${LEADS_SCALE_WARN}.`,
    };
  }
  return null;
}

export function contactsScaleNotice(
  count: number
): { level: ScaleNoticeLevel; message: string } | null {
  if (count >= SUPABASE_PAGE_SIZE) {
    return {
      level: "warn",
      message: `${count} contacts loaded. Analytics and filters use full-table scans in the browser — very large lists may feel slow.`,
    };
  }
  if (count >= CONTACTS_SCALE_WARN) {
    return {
      level: "info",
      message: `${count} contacts — table filters may take a moment above ~${CONTACTS_SCALE_WARN}.`,
    };
  }
  return null;
}

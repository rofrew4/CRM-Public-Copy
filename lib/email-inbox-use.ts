import type { EmailInboxUse } from "@/lib/types";

export const INBOX_USE_LABELS: Record<EmailInboxUse, string> = {
  personal: "Personal",
  instantly: "Instantly",
  smartlead: "Smartlead",
};

/** Full card / row surface colors by use. */
export const INBOX_USE_CARD_CLASS: Record<EmailInboxUse, string> = {
  personal: "border-indigo-200 bg-indigo-50",
  instantly: "border-emerald-200 bg-emerald-50",
  smartlead: "border-violet-200 bg-violet-50",
};

/** Table row left accent (list view — no box background). */
export const INBOX_USE_ROW_CLASS: Record<EmailInboxUse, string> = {
  personal: "border-l-[3px] border-l-indigo-500",
  instantly: "border-l-[3px] border-l-emerald-500",
  smartlead: "border-l-[3px] border-l-violet-500",
};

export const INBOX_USE_BADGE_CLASS: Record<EmailInboxUse, string> = {
  personal: "bg-indigo-100 text-indigo-800",
  instantly: "bg-emerald-100 text-emerald-800",
  smartlead: "bg-violet-100 text-violet-800",
};

export function normalizeInboxUse(value: string | null | undefined): EmailInboxUse {
  if (value === "instantly" || value === "smartlead" || value === "personal") {
    return value;
  }
  return "personal";
}

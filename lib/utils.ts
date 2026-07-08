import { format, parseISO, subDays, startOfDay } from "date-fns";
import type { Contact, Lead } from "./types";

export function getEmailDomain(email: string): string {
  const parts = email.trim().toLowerCase().split("@");
  return parts.length > 1 ? parts[1] : "";
}

export function normalizeEmail(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/^mailto:/i, "")
    .replace(/\s+/g, "");
}

export function contactDisplayName(c: Pick<Contact, "first_name" | "last_name" | "email">): string {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return name || c.email;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  try {
    return format(parseISO(date), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return "—";
  try {
    return format(parseISO(date), "MMM d, yyyy h:mm a");
  } catch {
    return "—";
  }
}

export function daysSince(date: string | null | undefined): number | null {
  if (!date) return null;
  try {
    const d = parseISO(date);
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

// TODO: Replace with proper encryption before production
export function encodePassword(password: string): string {
  return btoa(password);
}

export function decodePassword(encoded: string | null): string {
  if (!encoded) return "";
  try {
    return atob(encoded);
  } catch {
    return encoded;
  }
}

export function fillTemplate(
  text: string,
  contact: Pick<Contact, "first_name" | "last_name" | "email" | "company">
): string {
  const firstName = contact.first_name || "";
  const name = contactDisplayName(contact);
  const company = contact.company || "";
  return text
    .replace(/\{first_name\}/gi, firstName)
    .replace(/\{name\}/gi, name)
    .replace(/\{company\}/gi, company);
}

export function getLeadStuckLevel(lead: Lead): "none" | "yellow" | "red" {
  const days = daysSince(lead.status_entered_at ?? lead.updated_at);
  if (days !== null && days > 30) return "red";
  if (!lead.follow_up_date) return "yellow";
  if (days !== null && days > 14) return "yellow";
  return "none";
}

export function groupByDate<T extends { date: string }>(
  items: T[],
  days: number
): { date: string; count: number }[] {
  const result: { date: string; count: number }[] = [];
  const today = startOfDay(new Date());
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(today, i);
    const key = format(d, "yyyy-MM-dd");
    result.push({
      date: format(d, "MMM d"),
      count: items.filter((item) => item.date === key).length,
    });
  }
  return result;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getCsvValue(
  row: Record<string, string>,
  keys: string[]
): string {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.trim().toLowerCase().replace(/\s+/g, "_"), v])
  );
  for (const key of keys) {
    const val = normalized[key.toLowerCase()];
    if (val?.trim()) return val.trim();
  }
  return "";
}

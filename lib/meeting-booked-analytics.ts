import {
  addDays,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfWeek,
  subDays,
  subWeeks,
} from "date-fns";
import { supabase } from "@/lib/supabase";
import { SUPABASE_PAGE_SIZE } from "@/lib/scale-hints";
import { todayLogDate } from "@/lib/email-volume";
import type { Contact, LeadMeetingBookedEvent } from "@/lib/types";
import { contactDisplayName } from "@/lib/utils";

const EVENT_SELECT =
  "lead_id, booked_on, created_at, lead:leads(contact:contacts(first_name, last_name, company, email))";

export function bookingDateKey(bookedOn: string): string {
  return bookedOn.slice(0, 10);
}

function contactFromEvent(
  event: LeadMeetingBookedEvent
): Pick<Contact, "first_name" | "last_name" | "company" | "email"> | null {
  const raw = event.lead?.contact;
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

export async function fetchMeetingBookedEvents(): Promise<{
  events: LeadMeetingBookedEvent[];
  error: string | null;
}> {
  const all: LeadMeetingBookedEvent[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("lead_meeting_booked_events")
      .select(EVENT_SELECT)
      .order("booked_on", { ascending: false })
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) {
      const missing =
        error.message.includes("does not exist") ||
        error.message.includes("relation");
      return {
        events: all,
        error: missing
          ? "Demo bookings table not found. Run supabase/migrations/20250526_lead_meeting_booked_events.sql in the Supabase SQL Editor."
          : error.message,
      };
    }
    if (!data?.length) break;
    all.push(...(data as unknown as LeadMeetingBookedEvent[]));
    if (data.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }

  return { events: all, error: null };
}

/** @deprecated Use fetchMeetingBookedEvents */
export async function fetchAllMeetingBookedEvents(): Promise<
  LeadMeetingBookedEvent[]
> {
  const { events } = await fetchMeetingBookedEvents();
  return events;
}

export function meetingBookedPerDay(
  events: LeadMeetingBookedEvent[],
  days = 30
): { date: string; count: number; iso: string }[] {
  const byDate = new Map<string, number>();
  for (const e of events) {
    const key = bookingDateKey(e.booked_on);
    byDate.set(key, (byDate.get(key) ?? 0) + 1);
  }

  const result: { date: string; count: number; iso: string }[] = [];
  const today = startOfDay(new Date());
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(today, i);
    const key = format(d, "yyyy-MM-dd");
    result.push({
      date: format(d, "MMM d"),
      iso: key,
      count: byDate.get(key) ?? 0,
    });
  }
  return result;
}

export function meetingBookedPerWeek(
  events: LeadMeetingBookedEvent[],
  weeks = 12
): { week: string; count: number }[] {
  const result: { week: string; count: number }[] = [];
  const today = startOfDay(new Date());

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const startKey = format(weekStart, "yyyy-MM-dd");
    const endKey = format(weekEnd, "yyyy-MM-dd");
    const count = events.filter((e) => {
      const d = bookingDateKey(e.booked_on);
      return d >= startKey && d <= endKey;
    }).length;
    result.push({
      week: `Week of ${format(weekStart, "MMM d")}`,
      count,
    });
  }
  return result;
}

export function meetingBookedStats(events: LeadMeetingBookedEvent[]) {
  const today = todayLogDate();
  const weekStart = format(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );
  const weekEnd = format(
    endOfWeek(new Date(), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );

  let todayCount = 0;
  let thisWeek = 0;

  for (const e of events) {
    const d = bookingDateKey(e.booked_on);
    if (d === today) todayCount++;
    if (d >= weekStart && d <= weekEnd) thisWeek++;
  }

  return { todayCount, thisWeek, allTime: events.length };
}

export type MeetingBookedRow = {
  leadId: string;
  bookedOn: string;
  bookedOnLabel: string;
  leadName: string;
  company: string | null;
};

export function listMeetingBookings(
  events: LeadMeetingBookedEvent[],
  days = 14
): MeetingBookedRow[] {
  const since = format(subDays(startOfDay(new Date()), days - 1), "yyyy-MM-dd");

  return events
    .filter((e) => bookingDateKey(e.booked_on) >= since)
    .sort((a, b) =>
      bookingDateKey(b.booked_on).localeCompare(bookingDateKey(a.booked_on))
    )
    .map((e) => {
      const contact = contactFromEvent(e);
      const key = bookingDateKey(e.booked_on);
      return {
        leadId: e.lead_id,
        bookedOn: key,
        bookedOnLabel: format(parseISO(`${key}T12:00:00`), "EEE, MMM d"),
        leadName: contact ? contactDisplayName(contact) : "Unknown lead",
        company: contact?.company ?? null,
      };
    });
}

export function meetingBookedThisWeekBreakdown(
  events: LeadMeetingBookedEvent[]
): { date: string; iso: string; count: number }[] {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const byDate = new Map<string, number>();
  for (const e of events) {
    const key = bookingDateKey(e.booked_on);
    byDate.set(key, (byDate.get(key) ?? 0) + 1);
  }

  const result: { date: string; iso: string; count: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    const key = format(d, "yyyy-MM-dd");
    result.push({
      date: format(d, "EEE, MMM d"),
      iso: key,
      count: byDate.get(key) ?? 0,
    });
  }
  return result;
}

/** @deprecated Use meetingBookedThisWeekBreakdown */
export function meetingBookedDailyBreakdown(
  events: LeadMeetingBookedEvent[],
  days = 7
): { date: string; count: number }[] {
  const since = format(subDays(startOfDay(new Date()), days - 1), "yyyy-MM-dd");
  const byDate = new Map<string, number>();
  for (const e of events) {
    const key = bookingDateKey(e.booked_on);
    if (key < since) continue;
    byDate.set(key, (byDate.get(key) ?? 0) + 1);
  }

  const result: { date: string; count: number }[] = [];
  const today = startOfDay(new Date());
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(today, i);
    const key = format(d, "yyyy-MM-dd");
    const count = byDate.get(key) ?? 0;
    if (count > 0) {
      result.push({
        date: format(d, "EEE, MMM d"),
        count,
      });
    }
  }
  return result;
}

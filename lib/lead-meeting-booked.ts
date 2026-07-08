import { format, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";
import { SUPABASE_PAGE_SIZE } from "@/lib/scale-hints";
import { todayLogDate } from "@/lib/email-volume";
import { bookingDateKey } from "@/lib/meeting-booked-analytics";

const TABLE_MISSING =
  "Demo bookings table not found. Run supabase/migrations/20250526_lead_meeting_booked_events.sql in the Supabase SQL Editor.";

const MEETING_BOOKED_ACTIVITY = "%to Meeting Booked%";

function isDuplicateKeyError(error: { code?: string; message: string }): boolean {
  return error.code === "23505" || error.message.includes("duplicate key");
}

function isTableMissingError(message: string): boolean {
  return message.includes("does not exist") || message.includes("relation");
}

/** Record the first day a lead enters meeting booked; ignores repeat entries. */
export async function recordMeetingBookedEvent(
  leadId: string
): Promise<string | null> {
  const { error } = await supabase.from("lead_meeting_booked_events").insert({
    lead_id: leadId,
    booked_on: todayLogDate(),
  });

  if (!error) return null;
  if (isDuplicateKeyError(error)) return null;
  if (isTableMissingError(error.message)) return TABLE_MISSING;
  return error.message;
}

async function fetchEarliestActivityDates(): Promise<Map<string, string>> {
  const earliestByLead = new Map<string, string>();
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("lead_activity")
      .select("lead_id, created_at, description")
      .like("description", MEETING_BOOKED_ACTIVITY)
      .order("created_at", { ascending: true })
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) {
      if (isTableMissingError(error.message)) return earliestByLead;
      throw new Error(error.message);
    }
    if (!data?.length) break;

    for (const row of data) {
      if (earliestByLead.has(row.lead_id)) continue;
      earliestByLead.set(
        row.lead_id,
        format(parseISO(row.created_at), "yyyy-MM-dd")
      );
    }
    if (data.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }

  return earliestByLead;
}

async function fetchAllEventLeadIds(): Promise<string[]> {
  const ids: string[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("lead_meeting_booked_events")
      .select("lead_id")
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) {
      if (isTableMissingError(error.message)) return ids;
      throw new Error(error.message);
    }
    if (!data?.length) break;

    for (const row of data) {
      ids.push(row.lead_id);
    }
    if (data.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }

  return ids;
}

/** Drop rows for leads that never entered Meeting Booked (bad backfill artifacts). */
async function purgeInvalidMeetingBookedEvents(
  activityDates: Map<string, string>
): Promise<number> {
  const eventLeadIds = await fetchAllEventLeadIds();
  const invalid = eventLeadIds.filter((id) => !activityDates.has(id));

  if (invalid.length === 0) return 0;

  const { error } = await supabase
    .from("lead_meeting_booked_events")
    .delete()
    .in("lead_id", invalid);

  if (error) {
    if (isTableMissingError(error.message)) return 0;
    throw new Error(error.message);
  }

  return invalid.length;
}

/** Align booked_on with earliest Meeting Booked activity. */
async function syncBookedOnFromActivity(
  activityDates: Map<string, string>
): Promise<number> {
  let synced = 0;

  for (const [leadId, activityDate] of activityDates) {
    const { data, error } = await supabase
      .from("lead_meeting_booked_events")
      .select("booked_on")
      .eq("lead_id", leadId)
      .maybeSingle();

    if (error || !data) continue;

    const current = bookingDateKey(data.booked_on);
    if (current === activityDate) continue;

    const { error: updateErr } = await supabase
      .from("lead_meeting_booked_events")
      .update({ booked_on: activityDate })
      .eq("lead_id", leadId);

    if (!updateErr) synced++;
  }

  return synced;
}

/**
 * Sync demo booking events from activity history.
 * - Removes phantom rows (leads that never hit Meeting Booked)
 * - Inserts missing rows from activity
 * - Never overwrites with updated_at guesses
 */
export async function backfillMeetingBookedEvents(): Promise<{
  inserted: number;
  error: string | null;
}> {
  try {
    const activityDates = await fetchEarliestActivityDates();
    await purgeInvalidMeetingBookedEvents(activityDates);
    await syncBookedOnFromActivity(activityDates);

    const existingIds = new Set(await fetchAllEventLeadIds());
    const toInsert: { lead_id: string; booked_on: string }[] = [];

    for (const [lead_id, booked_on] of activityDates) {
      if (!existingIds.has(lead_id)) {
        toInsert.push({ lead_id, booked_on });
      }
    }

    if (toInsert.length === 0) {
      return { inserted: 0, error: null };
    }

    const { error } = await supabase
      .from("lead_meeting_booked_events")
      .upsert(toInsert, { onConflict: "lead_id", ignoreDuplicates: true });

    if (error) {
      if (isTableMissingError(error.message)) {
        return { inserted: 0, error: TABLE_MISSING };
      }
      return { inserted: 0, error: error.message };
    }

    return { inserted: toInsert.length, error: null };
  } catch (e) {
    return {
      inserted: 0,
      error: e instanceof Error ? e.message : "Backfill failed.",
    };
  }
}

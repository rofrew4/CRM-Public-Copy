import { supabase } from "@/lib/supabase";
import { SUPABASE_PAGE_SIZE } from "@/lib/scale-hints";
import {
  leadTranscriptStoragePath,
  removeLeadTranscriptPdf,
} from "@/lib/lead-transcript-storage";
import { cadenceForStage } from "@/lib/followup";
import { recordMeetingBookedEvent } from "@/lib/lead-meeting-booked";
import type { ActiveLeadStatus, Contact, Lead, LeadStatus } from "@/lib/types";

/** Kanban + search — omits heavy text fields (notes, meeting_transcript). */
const LEAD_BOARD_SELECT =
  "id,contact_id,status,follow_up_date,next_followup_at,last_followup_at,followup_count,followup_cadence_days,noshow_count,proposal_made,post_meeting_email_sent,awaiting_response_since,closed_reason,deal_value,close_lost_reason,meeting_transcript_path,created_at,status_entered_at,updated_at,contact:contacts(id,first_name,last_name,email,company,title,state,phone,vertical,last_contacted_date)";

function normalizeBoardLead(
  row: Omit<LeadWithContact, "contact" | "notes" | "meeting_transcript"> & {
    contact: Contact | Contact[];
  }
): LeadWithContact | null {
  const contact = Array.isArray(row.contact) ? row.contact[0] : row.contact;
  if (!contact) return null;
  return {
    ...row,
    contact,
    notes: null,
    meeting_transcript: null,
    next_followup_at: row.next_followup_at ?? null,
    last_followup_at: row.last_followup_at ?? null,
    followup_count: row.followup_count ?? 0,
    followup_cadence_days: row.followup_cadence_days ?? null,
    noshow_count: row.noshow_count ?? 0,
    proposal_made: row.proposal_made ?? false,
    post_meeting_email_sent: row.post_meeting_email_sent ?? false,
    awaiting_response_since: row.awaiting_response_since ?? null,
    closed_reason: row.closed_reason ?? null,
    status_entered_at: row.status_entered_at ?? row.created_at,
    personal_email_account_id: null,
  };
}

const LEAD_ANALYTICS_SELECT =
  "id, contact_id, status, follow_up_date, deal_value, personal_email_account_id, status_entered_at, updated_at, created_at";

export type LeadWithContact = Lead & { contact: Contact };

export async function fetchLeadsForBoard(): Promise<LeadWithContact[]> {
  const all: LeadWithContact[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("leads")
      .select(LEAD_BOARD_SELECT)
      .order("updated_at", { ascending: false })
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!data?.length) break;

    for (const row of data as unknown as Array<
      Omit<LeadWithContact, "contact" | "notes" | "meeting_transcript"> & {
        contact: Contact | Contact[];
      }
    >) {
      const lead = normalizeBoardLead(row);
      if (lead) all.push(lead);
    }
    if (data.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }

  return all;
}

/** Full lead row for drawer (notes, legacy transcript text, etc.). */
export async function fetchLeadWithContact(
  leadId: string
): Promise<LeadWithContact> {
  const { data, error } = await supabase
    .from("leads")
    .select("*, contact:contacts(*)")
    .eq("id", leadId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Lead not found.");
  }

  return data as LeadWithContact;
}

/** Open pipeline leads with a follow-up date, soonest first. */
export async function fetchLeadsWithFollowUps(): Promise<LeadWithContact[]> {
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_BOARD_SELECT)
    .or("next_followup_at.not.is.null,follow_up_date.not.is.null")
    .neq("status", "closed")
    .order("next_followup_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as Array<
    Omit<LeadWithContact, "contact" | "notes" | "meeting_transcript"> & {
      contact: Contact | Contact[];
    }
  >;

  const result: LeadWithContact[] = [];
  for (const row of rows) {
    const lead = normalizeBoardLead(row);
    if (lead) result.push(lead);
  }
  return result;
}

/** Paginated fetch for Analytics (no large text columns). */
export async function fetchAllLeads(): Promise<Lead[]> {
  const all: Lead[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("leads")
      .select(LEAD_ANALYTICS_SELECT)
      .order("updated_at", { ascending: false })
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!data?.length) break;

    for (const row of data as Lead[]) {
      all.push({
        ...row,
        notes: null,
        meeting_transcript: null,
        meeting_transcript_path: null,
        close_lost_reason: row.close_lost_reason ?? null,
        status_entered_at: row.status_entered_at ?? row.created_at,
      });
    }
    if (data.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }

  return all;
}

export async function removeLead(leadId: string): Promise<string | null> {
  const { data: lead } = await supabase
    .from("leads")
    .select("meeting_transcript_path")
    .eq("id", leadId)
    .maybeSingle();

  if (lead?.meeting_transcript_path) {
    try {
      await removeLeadTranscriptPdf(lead.meeting_transcript_path);
    } catch {
      // Continue removing lead even if storage delete fails
    }
  } else {
    try {
      await removeLeadTranscriptPdf(leadTranscriptStoragePath(leadId));
    } catch {
      // No file at default path
    }
  }

  const { error: activityError } = await supabase
    .from("lead_activity")
    .delete()
    .eq("lead_id", leadId);
  if (activityError) return activityError.message;

  const { error } = await supabase.from("leads").delete().eq("id", leadId);
  if (error) return error.message;

  return null;
}

export async function createLead(
  contactId: string,
  status: LeadStatus | string = "responded"
): Promise<{ id: string } | { error: string }> {
  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("contact_id", contactId)
    .maybeSingle();

  if (existing) {
    return { error: "This contact is already a lead." };
  }

  const insert: Record<string, unknown> = { contact_id: contactId, status };
  const cadence = cadenceForStage(status as ActiveLeadStatus);
  if (cadence != null) {
    insert.followup_cadence_days = cadence;
  }

  const { data, error } = await supabase
    .from("leads")
    .insert(insert)
    .select("id")
    .single();

  if (error) return { error: error.message };
  if (!data) return { error: "Failed to create lead." };

  await supabase.from("lead_activity").insert({
    lead_id: data.id,
    activity_type: "created",
    description: "Added to pipeline",
  });

  if (status === "meeting_booked") {
    await recordMeetingBookedEvent(data.id);
  }

  return { id: data.id };
}

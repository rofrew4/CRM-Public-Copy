import { addDays } from "date-fns";
import { NOSHOW_STAGES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import type { ActiveLeadStatus, Lead } from "@/lib/types";

function notifyTodoQueueChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("todo-queue-changed"));
  }
}

async function clientLogFollowup(leadId: string): Promise<{
  lead: Lead | null;
  error: string | null;
}> {
  const { data: existing, error: fetchErr } = await supabase
    .from("leads")
    .select("followup_count, followup_cadence_days")
    .eq("id", leadId)
    .single();

  if (fetchErr || !existing) {
    return { lead: null, error: fetchErr?.message ?? "Lead not found." };
  }

  const cadence = existing.followup_cadence_days ?? 3;
  const now = new Date();

  const { data, error } = await supabase
    .from("leads")
    .update({
      last_followup_at: now.toISOString(),
      next_followup_at: addDays(now, cadence).toISOString(),
      followup_count: (existing.followup_count ?? 0) + 1,
      awaiting_response_since: now.toISOString(),
    })
    .eq("id", leadId)
    .select()
    .single();

  if (error) return { lead: null, error: error.message };

  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    activity_type: "followup",
    description: "Followed up",
  });

  notifyTodoQueueChanged();
  return { lead: data as Lead, error: null };
}

async function clientLogNoshow(leadId: string): Promise<{
  lead: Lead | null;
  error: string | null;
}> {
  const { data: existing, error: fetchErr } = await supabase
    .from("leads")
    .select("noshow_count, status")
    .eq("id", leadId)
    .single();

  if (fetchErr || !existing) {
    return { lead: null, error: fetchErr?.message ?? "Lead not found." };
  }

  if (!NOSHOW_STAGES.includes(existing.status as ActiveLeadStatus)) {
    return { lead: null, error: "No-show is not available in this stage." };
  }

  const { data, error } = await supabase
    .from("leads")
    .update({
      noshow_count: 1,
      next_followup_at: addDays(new Date(), 2).toISOString(),
    })
    .eq("id", leadId)
    .select()
    .single();

  if (error) return { lead: null, error: error.message };

  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    activity_type: "noshow",
    description: "No-show logged",
  });

  notifyTodoQueueChanged();
  return { lead: data as Lead, error: null };
}

export async function rpcLogFollowup(leadId: string): Promise<{
  lead: Lead | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("log_followup", {
    p_lead_id: leadId,
  });

  if (!error && data) {
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      notifyTodoQueueChanged();
      return { lead: row as Lead, error: null };
    }
  }

  return clientLogFollowup(leadId);
}

export async function rpcLogNoshow(leadId: string): Promise<{
  lead: Lead | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("log_noshow", {
    p_lead_id: leadId,
  });

  if (!error && data) {
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      notifyTodoQueueChanged();
      return { lead: row as Lead, error: null };
    }
  }

  return clientLogNoshow(leadId);
}

export async function markReplyReceived(leadId: string): Promise<string | null> {
  const { error } = await supabase
    .from("leads")
    .update({
      awaiting_response_since: null,
      followup_count: 0,
      noshow_count: 0,
    })
    .eq("id", leadId);
  if (!error) notifyTodoQueueChanged();
  return error?.message ?? null;
}

/** @deprecated Use markReplyReceived */
export async function clearAwaitingResponse(leadId: string): Promise<string | null> {
  return markReplyReceived(leadId);
}

export async function snoozeFollowupDays(
  leadId: string,
  days: number
): Promise<{ next_followup_at: string } | { error: string }> {
  const next_followup_at = addDays(new Date(), days).toISOString();
  const { data, error } = await supabase
    .from("leads")
    .update({ next_followup_at })
    .eq("id", leadId)
    .select("next_followup_at")
    .single();
  if (error) return { error: error.message };
  notifyTodoQueueChanged();
  return { next_followup_at: data.next_followup_at };
}

export async function setNextFollowupAt(
  leadId: string,
  iso: string | null,
  cadenceDays?: number | null
): Promise<string | null> {
  const payload: Record<string, unknown> = { next_followup_at: iso };
  if (cadenceDays != null) {
    payload.followup_cadence_days = cadenceDays;
  }
  const { error } = await supabase
    .from("leads")
    .update(payload)
    .eq("id", leadId);
  if (!error) notifyTodoQueueChanged();
  return error?.message ?? null;
}

export async function setProposalMade(
  leadId: string,
  made: boolean
): Promise<string | null> {
  const { error } = await supabase
    .from("leads")
    .update({ proposal_made: made })
    .eq("id", leadId);
  return error?.message ?? null;
}

export async function setPostMeetingEmailSent(
  leadId: string
): Promise<string | null> {
  const { error } = await supabase
    .from("leads")
    .update({ post_meeting_email_sent: true })
    .eq("id", leadId);
  return error?.message ?? null;
}

export async function rescheduleFollowup(
  leadId: string,
  iso: string
): Promise<string | null> {
  const { error } = await supabase
    .from("leads")
    .update({
      next_followup_at: iso,
      awaiting_response_since: null,
    })
    .eq("id", leadId);
  if (!error) notifyTodoQueueChanged();
  return error?.message ?? null;
}

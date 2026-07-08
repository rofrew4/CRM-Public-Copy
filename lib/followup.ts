import {
  addDays,
  differenceInCalendarDays,
  format,
  isBefore,
  isToday,
  parseISO,
  startOfDay,
} from "date-fns";
import {
  AWAITING_RESPONSE_NUDGE_DAYS,
  FOLLOWUP_CADENCE_DAYS,
  FOLLOWUP_WIDGET_STAGES,
  NUDGE_FOLLOWUP_COUNT,
  NO_FOLLOWUP_WARNING_DAYS,
  NOSHOW_STAGES,
  SNOOZE_HIDE_DAYS,
} from "@/lib/constants";
import type { ActiveLeadStatus, Lead } from "@/lib/types";
import { daysSince } from "@/lib/utils";

export type FollowupUrgency = "overdue" | "due" | "waiting" | "none";

/** Only overdue/due affect column order; waiting and none share the same tier. */
function sortUrgencyRank(urgency: FollowupUrgency): number {
  if (urgency === "overdue") return 0;
  if (urgency === "due") return 1;
  return 2;
}

export function hadNoshow(lead: Pick<Lead, "noshow_count">): boolean {
  return (lead.noshow_count ?? 0) > 0;
}

/** No-show badge/button only apply in stages that support logging a no-show. */
export function hadNoshowInStage(
  lead: Pick<Lead, "noshow_count" | "status">
): boolean {
  if (!hadNoshow(lead) || lead.status === "closed") return false;
  return NOSHOW_STAGES.includes(lead.status as ActiveLeadStatus);
}

export function effectiveNextFollowupAt(
  lead: Pick<Lead, "next_followup_at" | "follow_up_date">
): string | null {
  return lead.next_followup_at ?? lead.follow_up_date;
}

export function getFollowupUrgency(
  lead: Pick<Lead, "next_followup_at" | "follow_up_date">
): FollowupUrgency {
  const at = effectiveNextFollowupAt(lead);
  if (!at) return "none";
  const d = startOfDay(parseISO(at));
  const today = startOfDay(new Date());
  if (isBefore(d, today)) return "overdue";
  if (isToday(d)) return "due";
  return "waiting";
}

export function isSnoozed(
  lead: Pick<Lead, "next_followup_at" | "follow_up_date">
): boolean {
  const at = effectiveNextFollowupAt(lead);
  if (!at) return false;
  const d = startOfDay(parseISO(at));
  const cutoff = startOfDay(addDays(new Date(), SNOOZE_HIDE_DAYS));
  return d > cutoff;
}

export function isAwaitingResponse(lead: Pick<Lead, "awaiting_response_since">): boolean {
  return lead.awaiting_response_since != null;
}

export function daysAwaitingResponse(
  lead: Pick<Lead, "awaiting_response_since">
): number | null {
  if (!lead.awaiting_response_since) return null;
  return differenceInCalendarDays(new Date(), parseISO(lead.awaiting_response_since));
}

export function shouldShowAwaitingNudge(
  lead: Pick<Lead, "awaiting_response_since">
): boolean {
  const days = daysAwaitingResponse(lead);
  return days != null && days >= AWAITING_RESPONSE_NUDGE_DAYS;
}

export function shouldShowCloseOutNudge(
  lead: Pick<Lead, "followup_count">
): boolean {
  return lead.followup_count >= NUDGE_FOLLOWUP_COUNT;
}

export function shouldShowFollowupWidget(
  lead: Pick<Lead, "status" | "next_followup_at" | "post_meeting_email_sent">
): boolean {
  if (lead.status === "closed") return false;
  if (lead.status === "meeting_booked") {
    return lead.next_followup_at != null;
  }
  if (lead.status === "meeting_taken") {
    return lead.post_meeting_email_sent === true;
  }
  return FOLLOWUP_WIDGET_STAGES.includes(lead.status as ActiveLeadStatus);
}

export function needsPostMeetingEmail(
  lead: Pick<Lead, "status" | "post_meeting_email_sent">
): boolean {
  return lead.status === "meeting_taken" && !lead.post_meeting_email_sent;
}

export function isFollowupActionable(urgency: FollowupUrgency): boolean {
  return urgency === "due" || urgency === "overdue";
}

export function cadenceForStage(status: ActiveLeadStatus): number | null {
  return FOLLOWUP_CADENCE_DAYS[status] ?? null;
}

export function initialNextFollowupAt(status: ActiveLeadStatus): string | null {
  const days = cadenceForStage(status);
  if (days == null) return null;
  return addDays(new Date(), days).toISOString();
}

function stageEnteredAt(lead: Pick<Lead, "status_entered_at" | "updated_at">): string {
  return lead.status_entered_at ?? lead.updated_at;
}

export function needsNoFollowupWarning(
  lead: Pick<Lead, "status" | "next_followup_at" | "status_entered_at" | "updated_at">
): boolean {
  if (lead.status === "closed" || lead.status === "meeting_booked") return false;
  if (lead.next_followup_at) return false;
  if (!FOLLOWUP_WIDGET_STAGES.includes(lead.status as ActiveLeadStatus)) {
    return false;
  }
  const days = daysSince(stageEnteredAt(lead));
  return days != null && days > NO_FOLLOWUP_WARNING_DAYS;
}

export function lastTouchLabel(
  lead: Pick<Lead, "last_followup_at">,
  contactLastContacted: string | null | undefined
): string {
  const touch = lead.last_followup_at ?? contactLastContacted;
  if (!touch) return "no contact yet";
  try {
    return format(parseISO(touch), "MMM d");
  } catch {
    return "no contact yet";
  }
}

export function daysInStage(
  lead: Pick<Lead, "status_entered_at" | "updated_at">
): number | null {
  return daysSince(stageEnteredAt(lead));
}

export function sortLeadsByUrgency<T extends Lead>(leads: T[]): T[] {
  return [...leads].sort((a, b) => {
    const ra = sortUrgencyRank(getFollowupUrgency(a));
    const rb = sortUrgencyRank(getFollowupUrgency(b));
    if (ra !== rb) return ra - rb;
    const da = daysInStage(a) ?? 9999;
    const db = daysInStage(b) ?? 9999;
    return da - db;
  });
}

export function formatFollowupChipDate(iso: string | null): string {
  if (!iso) return "Set followup?";
  try {
    return format(parseISO(iso), "MMM d");
  } catch {
    return "Set followup?";
  }
}

export function formatFollowupChipLabel(iso: string | null): string {
  if (!iso) return "Set followup?";
  try {
    return `Follow-up ${format(parseISO(iso), "MMM d")}`;
  } catch {
    return "Set followup?";
  }
}

/** Cleared when a lead enters a new pipeline stage. */
export function followupResetPayload(
  newStatus: ActiveLeadStatus | "closed"
): Partial<Lead> {
  const cadence =
    newStatus === "closed" ? null : cadenceForStage(newStatus as ActiveLeadStatus);

  return {
    next_followup_at: null,
    last_followup_at: null,
    followup_count: 0,
    awaiting_response_since: null,
    follow_up_date: null,
    followup_cadence_days: cadence,
    proposal_made: false,
    post_meeting_email_sent: false,
    noshow_count: 0,
  };
}

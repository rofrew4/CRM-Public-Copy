import { parseISO } from "date-fns";
import { fetchLeadsForBoard, type LeadWithContact } from "@/lib/leads-api";
import {
  effectiveNextFollowupAt,
  getFollowupUrgency,
  needsNoFollowupWarning,
  needsPostMeetingEmail,
  shouldShowAwaitingNudge,
  shouldShowFollowupWidget,
  sortLeadsByUrgency,
} from "@/lib/followup";
import { FOLLOWUP_WIDGET_STAGES } from "@/lib/constants";
import type { ActiveLeadStatus } from "@/lib/types";
import { contactDisplayName } from "@/lib/utils";

export type TodoReachOutTask =
  | "follow_up"
  | "post_meeting_email"
  | "proposal"
  | "awaiting_reply"
  | "no_followup_scheduled";

export type TodoReachOutRow = LeadWithContact & {
  kind: "reach_out";
  task: TodoReachOutTask;
  label: string;
};

export type TodoAwaitingRow = LeadWithContact & { kind: "awaiting" };

export type TodoQueueRow = TodoReachOutRow | TodoAwaitingRow;

function leadName(lead: LeadWithContact): string {
  return contactDisplayName(lead.contact);
}

function needsProposal(lead: LeadWithContact): boolean {
  return lead.status === "2nd_call_booked" && !lead.proposal_made;
}

function isFollowupDue(lead: LeadWithContact): boolean {
  const urgency = getFollowupUrgency(lead);
  if (urgency !== "overdue" && urgency !== "due") return false;
  if (!effectiveNextFollowupAt(lead)) return false;
  return shouldShowFollowupWidget(lead);
}

/** One reach-out row per lead — matches kanban highlight priority. */
export function getLeadReachOutTask(
  lead: LeadWithContact
): { task: TodoReachOutTask; label: string } | null {
  if (lead.status === "closed") return null;

  const name = leadName(lead);

  if (needsPostMeetingEmail(lead)) {
    return {
      task: "post_meeting_email",
      label: `Post meeting email for ${name}`,
    };
  }

  if (needsProposal(lead)) {
    return {
      task: "proposal",
      label: `Make proposal for ${name}`,
    };
  }

  if (lead.awaiting_response_since && shouldShowAwaitingNudge(lead)) {
    return {
      task: "awaiting_reply",
      label: `Follow up again — ${name}`,
    };
  }

  if (isFollowupDue(lead)) {
    return {
      task: "follow_up",
      label: `Follow-up (${name})`,
    };
  }

  if (
    FOLLOWUP_WIDGET_STAGES.includes(lead.status as ActiveLeadStatus) &&
    !effectiveNextFollowupAt(lead) &&
    needsNoFollowupWarning(lead)
  ) {
    return {
      task: "no_followup_scheduled",
      label: `Schedule follow-up for ${name}`,
    };
  }

  return null;
}

export function buildTodoQueue(leads: LeadWithContact[]): {
  reachOut: TodoReachOutRow[];
  awaiting: TodoAwaitingRow[];
  total: number;
} {
  const reachOut: TodoReachOutRow[] = [];
  const awaiting: TodoAwaitingRow[] = [];

  for (const lead of leads) {
    if (lead.status === "closed") continue;

    const task = getLeadReachOutTask(lead);
    if (task) {
      reachOut.push({ ...lead, kind: "reach_out", ...task });
      continue;
    }

    if (lead.awaiting_response_since && !shouldShowAwaitingNudge(lead)) {
      awaiting.push({ ...lead, kind: "awaiting" });
    }
  }

  const taskRank: Record<TodoReachOutTask, number> = {
    post_meeting_email: 0,
    proposal: 1,
    awaiting_reply: 2,
    follow_up: 3,
    no_followup_scheduled: 4,
  };

  reachOut.sort((a, b) => {
    const tr = taskRank[a.task] - taskRank[b.task];
    if (tr !== 0) return tr;
    if (a.task === "follow_up" || b.task === "follow_up") {
      return sortLeadsByUrgency([a, b])[0] === a ? -1 : 1;
    }
    return leadName(a).localeCompare(leadName(b));
  });

  awaiting.sort(
    (a, b) =>
      parseISO(a.awaiting_response_since!).getTime() -
      parseISO(b.awaiting_response_since!).getTime()
  );

  return {
    reachOut,
    awaiting,
    total: reachOut.length + awaiting.length,
  };
}

export async function fetchTodoQueueCount(): Promise<number> {
  try {
    const { supabase } = await import("@/lib/supabase");
    const [leads, todosRes] = await Promise.all([
      fetchLeadsForBoard(),
      supabase.from("todos").select("id").eq("done", false),
    ]);
    const manual = todosRes.data?.length ?? 0;
    return buildTodoQueue(leads).total + manual;
  } catch {
    return 0;
  }
}

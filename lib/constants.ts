import type { ActiveLeadStatus, ClosedReason, LeadStatus } from "@/lib/types";

/** Days until next follow-up per active stage (Meeting Booked has no default cadence). */
export const FOLLOWUP_CADENCE_DAYS: Partial<Record<ActiveLeadStatus, number>> = {
  responded: 3,
  meeting_requested: 4,
  meeting_taken: 3,
  "2nd_call_booked": 5,
  proposal_sent: 5,
};

/** Stages that show the follow-up widget by default. */
export const FOLLOWUP_WIDGET_STAGES: ActiveLeadStatus[] = [
  "responded",
  "meeting_requested",
  "meeting_taken",
  "2nd_call_booked",
  "proposal_sent",
];

/** Stages where the no-show button is visible. */
export const NOSHOW_STAGES: ActiveLeadStatus[] = [
  "meeting_booked",
  "2nd_call_booked",
];

export const NUDGE_FOLLOWUP_COUNT = 2;
export const AWAITING_RESPONSE_NUDGE_DAYS = 2;
export const SNOOZE_HIDE_DAYS = 14;
export const SNOOZE_PUSH_DAYS = 3;
export const NOSHOW_PUSH_DAYS = 2;
export const NO_FOLLOWUP_WARNING_DAYS = 3;

export const PIPELINE_COLUMNS: ActiveLeadStatus[] = [
  "responded",
  "meeting_requested",
  "meeting_booked",
  "meeting_taken",
  "2nd_call_booked",
  "proposal_sent",
];

export const CLOSED_REASONS = [
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "non_fit", label: "Non-fit" },
  { value: "ghosted", label: "Ghosted" },
] as const satisfies ReadonlyArray<{ value: ClosedReason; label: string }>;

export const STAGE_CSS_VAR: Record<LeadStatus, string> = {
  responded: "--stage-responded",
  meeting_requested: "--stage-meeting-requested",
  meeting_booked: "--stage-meeting-booked",
  meeting_taken: "--stage-meeting-taken",
  "2nd_call_booked": "--stage-2nd-call-booked",
  proposal_sent: "--stage-proposal-sent",
  closed: "--stage-closed",
};

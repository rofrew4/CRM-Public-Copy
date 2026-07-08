import type { FollowupUrgency } from "@/lib/followup";
import type { LeadStatus } from "@/lib/types";
import { STAGE_CSS_VAR } from "@/lib/constants";

export function stageCssVar(status: LeadStatus): string {
  return STAGE_CSS_VAR[status] ?? "--stage-closed";
}

export type CardVisualState =
  | "neutral"
  | "urgent"
  | "awaiting-border"
  | "snoozed"
  | "closed"
  | "proposal-needed"
  | "post-meeting-pending";

export function getCardVisualState(opts: {
  columnStatus: LeadStatus;
  urgency: FollowupUrgency;
  awaitingResponse: boolean;
  awaitingNudge: boolean;
  snoozed: boolean;
  isClosed: boolean;
  needsProposal: boolean;
  needsPostMeetingEmail: boolean;
}): CardVisualState {
  if (opts.isClosed) return "closed";
  if (opts.snoozed) return "snoozed";
  if (opts.needsPostMeetingEmail) return "post-meeting-pending";
  if (opts.needsProposal) return "proposal-needed";
  if (opts.awaitingResponse && opts.awaitingNudge) return "awaiting-border";
  if (opts.urgency === "overdue" || opts.urgency === "due") return "urgent";
  return "neutral";
}

export function cardSurfaceStyle(
  status: LeadStatus,
  visual: CardVisualState
): React.CSSProperties {
  const v = `var(${stageCssVar(status)})`;
  switch (visual) {
    case "urgent":
    case "proposal-needed":
    case "post-meeting-pending":
      return {
        backgroundColor: `color-mix(in srgb, ${v} 18%, white)`,
        borderColor: v,
      };
    case "awaiting-border":
      return {
        backgroundColor: `color-mix(in srgb, ${v} 20%, white)`,
        borderColor: v,
      };
    case "snoozed":
      return {
        backgroundColor: "var(--surface-muted)",
        borderColor: "var(--border)",
        opacity: 0.55,
      };
    case "closed":
      return {
        backgroundColor: "var(--surface-muted)",
        borderColor: "var(--border)",
      };
    default:
      return {
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      };
  }
}

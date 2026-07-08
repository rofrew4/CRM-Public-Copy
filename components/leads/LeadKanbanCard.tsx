"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import type { ClosedReason } from "@/lib/types";
import type { LeadWithContact } from "@/lib/leads-api";
import { CLOSED_REASONS, NOSHOW_STAGES } from "@/lib/constants";
import {
  daysAwaitingResponse,
  formatFollowupChipLabel,
  getFollowupUrgency,
  hadNoshowInStage,
  isAwaitingResponse,
  isFollowupActionable,
  isSnoozed,
  lastTouchLabel,
  needsPostMeetingEmail,
  shouldShowAwaitingNudge,
  shouldShowCloseOutNudge,
  shouldShowFollowupWidget,
  daysInStage,
} from "@/lib/followup";
import {
  cardSurfaceStyle,
  getCardVisualState,
  stageCssVar,
} from "@/lib/lead-card-ui";
import { CLOSED_REASON_LABELS, LEAD_STATUS_LABELS } from "@/lib/types";
import { cn, contactDisplayName } from "@/lib/utils";
import type { ActiveLeadStatus, LeadStatus } from "@/lib/types";

type LeadKanbanCardProps = {
  lead: LeadWithContact;
  columnStatus: LeadStatus;
  dimmed?: boolean;
  showClosedPicker?: boolean;
  onOpen: () => void;
  onLogFollowup: () => void;
  onLogNoshow: () => void;
  onRescheduleFollowup: (iso: string) => void;
  onSetFollowupDate: (iso: string | null) => void;
  onMarkProposalMade: () => void;
  onMarkPostMeetingEmail: () => void;
  onPickClosedReason: (reason: ClosedReason) => void;
  onDismissClosedPicker: () => void;
  onCloseOut: () => void;
};

function FollowupDateButton({
  forReschedule,
  value,
  onDateChange,
  className,
  style,
  children,
}: {
  forReschedule: boolean;
  value: string;
  onDateChange: (value: string, forReschedule: boolean) => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const input = inputRef.current;
    if (!input) return;
    try {
      if (typeof input.showPicker === "function") {
        input.showPicker();
        return;
      }
    } catch {
      // fall through
    }
    input.focus({ preventScroll: true });
    input.click();
  };

  return (
    <div
      className="relative inline-block"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={openPicker}
        className={className}
        style={style}
      >
        {children}
      </button>
      <input
        ref={inputRef}
        type="date"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-0"
        value={value}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          onDateChange(e.target.value, forReschedule);
          e.target.blur();
        }}
      />
    </div>
  );
}

export function LeadKanbanCard({
  lead,
  columnStatus,
  dimmed,
  showClosedPicker,
  onOpen,
  onLogFollowup,
  onLogNoshow,
  onRescheduleFollowup,
  onSetFollowupDate,
  onMarkProposalMade,
  onMarkPostMeetingEmail,
  onPickClosedReason,
  onDismissClosedPicker,
  onCloseOut,
}: LeadKanbanCardProps) {
  const urgency = getFollowupUrgency(lead);
  const hasFollowup = lead.next_followup_at != null;
  const awaiting = isAwaitingResponse(lead);
  const awaitingDays = daysAwaitingResponse(lead);
  const awaitingNudge = shouldShowAwaitingNudge(lead);
  const snoozed = isSnoozed(lead);
  const showWidget = shouldShowFollowupWidget(lead);
  const showNoshowBtn = NOSHOW_STAGES.includes(lead.status as ActiveLeadStatus);
  const isNoshow = hadNoshowInStage(lead);
  const showNoshowControl = showNoshowBtn && !isNoshow;
  const closeNudge = shouldShowCloseOutNudge(lead);
  const isClosed = lead.status === "closed";
  const showActionRow = !isClosed && (showWidget || showNoshowControl);
  const needsProposal =
    lead.status === "2nd_call_booked" && !lead.proposal_made;
  const postMeetingPending = needsPostMeetingEmail(lead);
  const followupDue = isFollowupActionable(urgency);

  const visual = getCardVisualState({
    columnStatus,
    urgency,
    awaitingResponse: awaiting,
    awaitingNudge,
    snoozed: dimmed ?? snoozed,
    isClosed,
    needsProposal,
    needsPostMeetingEmail: postMeetingPending,
  });

  const surface = cardSurfaceStyle(columnStatus, visual);
  const stageVar = `var(${stageCssVar(columnStatus)})`;

  const handleDateChange = (value: string, forReschedule: boolean) => {
    const iso = value ? new Date(`${value}T12:00:00`).toISOString() : null;
    if (forReschedule && iso) {
      onRescheduleFollowup(iso);
    } else {
      onSetFollowupDate(iso);
    }
  };

  const followupDateValue = lead.next_followup_at?.slice(0, 10) ?? "";

  if (showClosedPicker) {
    return (
      <div
        className="cursor-default rounded-md border p-3"
        style={cardSurfaceStyle("closed", "closed")}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-medium text-[var(--foreground)]">
          Close {contactDisplayName(lead.contact)}?
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1">
          {CLOSED_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onPickClosedReason(r.value)}
              className="cursor-pointer rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs hover:bg-[var(--surface-muted)]"
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onDismissClosedPicker}
          className="mt-2 cursor-pointer text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      className={cn(
        "w-full cursor-pointer select-none rounded-md border p-3 text-left transition-colors",
        dimmed && "opacity-55"
      )}
      style={surface}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-[var(--foreground)]">
            {contactDisplayName(lead.contact)}
          </div>
          <div className="truncate text-xs text-[var(--muted)]">
            {lead.contact.company || "—"}
          </div>
        </div>
        {isClosed && lead.closed_reason ? (
          <span className="shrink-0 rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
            {CLOSED_REASON_LABELS[lead.closed_reason]}
          </span>
        ) : null}
        {awaiting && !isClosed ? (
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              color: stageVar,
              backgroundColor: `color-mix(in srgb, ${stageVar} ${awaitingNudge ? 18 : 10}%, white)`,
            }}
          >
            Awaiting {awaitingDays ?? 0}d
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--muted)]">
        <span>{daysInStage(lead) ?? 0}d in stage</span>
        <span>·</span>
        <span>{lastTouchLabel(lead, lead.contact.last_contacted_date)}</span>
        {lead.followup_count > 0 ? (
          <span className="rounded border border-[var(--border)] px-1 py-px text-[10px]">
            {lead.followup_count}×
          </span>
        ) : null}
        {isNoshow ? (
          <span
            className="rounded px-1 py-px text-[10px] font-medium text-red-600"
            style={{
              backgroundColor: "color-mix(in srgb, #dc2626 12%, white)",
            }}
          >
            No-show
          </span>
        ) : null}
      </div>

      {needsProposal ? (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onMarkProposalMade}
            className="cursor-pointer rounded border px-2 py-1 text-xs font-medium"
            style={{
              borderColor: stageVar,
              color: stageVar,
              backgroundColor: `color-mix(in srgb, ${stageVar} 10%, white)`,
            }}
          >
            Mark proposal made
          </button>
        </div>
      ) : null}

      {postMeetingPending && !isClosed ? (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onMarkPostMeetingEmail}
            className="cursor-pointer rounded border px-2 py-1 text-xs font-medium"
            style={{
              borderColor: stageVar,
              color: stageVar,
              backgroundColor: `color-mix(in srgb, ${stageVar} 12%, white)`,
            }}
          >
            Mark post meeting email
          </button>
        </div>
      ) : null}

      {showActionRow ? (
        <div
          className="mt-3 flex flex-wrap items-center gap-2"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {showWidget && awaiting ? (
            <FollowupDateButton
              forReschedule
              value={followupDateValue}
              onDateChange={handleDateChange}
              className="cursor-pointer rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs hover:bg-[var(--surface-muted)]"
            >
              Follow up again
            </FollowupDateButton>
          ) : showWidget ? (
            <>
              <FollowupDateButton
                forReschedule={false}
                value={followupDateValue}
                onDateChange={handleDateChange}
                className={cn(
                  "cursor-pointer rounded border px-2 py-1 text-xs",
                  !hasFollowup && "border-dashed",
                  (urgency === "overdue" || urgency === "due") && "font-medium"
                )}
                style={
                  urgency === "overdue" || urgency === "due"
                    ? {
                        borderColor: stageVar,
                        color: stageVar,
                        backgroundColor: `color-mix(in srgb, ${stageVar} 8%, white)`,
                      }
                    : {
                        borderColor: "var(--border)",
                        color: "var(--muted)",
                        backgroundColor: "var(--surface)",
                      }
                }
              >
                {formatFollowupChipLabel(lead.next_followup_at)}
              </FollowupDateButton>
              {hasFollowup && followupDue ? (
                <button
                  type="button"
                  onClick={onLogFollowup}
                  className="cursor-pointer rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-medium hover:bg-[var(--surface-muted)]"
                >
                  Mark follow-up
                </button>
              ) : null}
            </>
          ) : null}

          {showNoshowControl ? (
            <button
              type="button"
              onClick={onLogNoshow}
              className="cursor-pointer rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)] hover:bg-[var(--surface-muted)]"
            >
              No-show
            </button>
          ) : null}
        </div>
      ) : null}

      {awaiting && awaitingNudge && !isClosed ? (
        <p
          className="mt-2 text-[11px]"
          style={{ color: stageVar }}
          onClick={(e) => e.stopPropagation()}
        >
          No reply yet — follow up again
        </p>
      ) : null}

      {closeNudge && !isClosed ? (
        <div
          className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]"
          onClick={(e) => e.stopPropagation()}
        >
          <span>Followed up twice with no reply — close this out?</span>
          <button
            type="button"
            onClick={onCloseOut}
            className="cursor-pointer rounded border border-[var(--border)] px-2 py-0.5 text-[10px] hover:bg-[var(--surface-muted)]"
          >
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function LeadCardOverlay({
  lead,
  columnStatus,
}: {
  lead: LeadWithContact;
  columnStatus: LeadStatus;
}) {
  return (
    <div
      className="w-56 cursor-pointer rounded-md border p-3"
      style={cardSurfaceStyle(columnStatus, "neutral")}
    >
      <div className="text-sm font-medium">{contactDisplayName(lead.contact)}</div>
      <div className="text-xs text-[var(--muted)]">
        {LEAD_STATUS_LABELS[columnStatus]}
      </div>
    </div>
  );
}

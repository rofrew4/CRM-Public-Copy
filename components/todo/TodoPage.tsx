"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchLeadsForBoard, type LeadWithContact } from "@/lib/leads-api";
import {
  rpcLogFollowup,
  setPostMeetingEmailSent,
  setProposalMade,
  snoozeFollowupDays,
} from "@/lib/leads-followup-rpc";
import { SNOOZE_PUSH_DAYS } from "@/lib/constants";
import {
  buildTodoQueue,
  type TodoAwaitingRow,
  type TodoReachOutRow,
} from "@/lib/todo-queue";
import {
  daysAwaitingResponse,
  formatFollowupChipLabel,
  getFollowupUrgency,
  hadNoshowInStage,
  shouldShowCloseOutNudge,
} from "@/lib/followup";
import { CLOSED_REASON_LABELS, LEAD_STATUS_LABELS } from "@/lib/types";
import type { ClosedReason } from "@/lib/types";
import { cn, contactDisplayName } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { ManualTodoPanel } from "@/components/todo/ManualTodoPanel";

function ReachOutRow({
  row,
  onMarkFollowup,
  onSnooze,
  onMarkPostMeetingEmail,
  onMarkProposal,
  onFollowUpAgain,
  onCloseOut,
}: {
  row: TodoReachOutRow;
  onMarkFollowup: () => void;
  onSnooze: () => void;
  onMarkPostMeetingEmail: () => void;
  onMarkProposal: () => void;
  onFollowUpAgain: () => void;
  onCloseOut: () => void;
}) {
  const closeNudge = shouldShowCloseOutNudge(row);
  const urgency = getFollowupUrgency(row);

  return (
    <li className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/leads?lead=${row.id}`}
            className="text-sm font-medium text-[var(--foreground)] hover:underline"
          >
            {row.label}
          </Link>
          <p className="text-xs text-[var(--muted)]">
            {row.contact.company || "—"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
              {LEAD_STATUS_LABELS[row.status]}
            </span>
            {hadNoshowInStage(row) ? (
              <span className="rounded px-1 py-px text-[10px] font-medium text-red-600">
                No-show
              </span>
            ) : null}
            {row.task === "follow_up" && row.next_followup_at ? (
              <span
                className={cn(
                  "rounded border px-2 py-0.5 text-[11px]",
                  urgency === "overdue" || urgency === "due"
                    ? "border-[var(--stage-responded)] text-[var(--stage-responded)]"
                    : "border-[var(--border)] text-[var(--muted)]"
                )}
              >
                {formatFollowupChipLabel(row.next_followup_at)}
              </span>
            ) : null}
            {row.task === "awaiting_reply" ? (
              <span className="text-[10px] text-[var(--muted)]">
                {daysAwaitingResponse(row) ?? 0}d awaiting
              </span>
            ) : null}
          </div>
          {row.task === "no_followup_scheduled" ? (
            <p className="mt-1 text-[11px] text-[var(--stage-meeting-requested)]">
              No follow-up scheduled
            </p>
          ) : null}
          {closeNudge && row.task === "follow_up" ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
              <span>Followed up twice with no reply — close this out?</span>
              <button
                type="button"
                onClick={onCloseOut}
                className="rounded border border-[var(--border)] px-2 py-0.5 hover:bg-[var(--surface-muted)]"
              >
                Close
              </button>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-1">
          {row.task === "follow_up" ? (
            <>
              <Button variant="secondary" onClick={onMarkFollowup}>
                Mark follow-up
              </Button>
              <button
                type="button"
                onClick={onSnooze}
                className="rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--surface-muted)]"
              >
                Snooze 3d
              </button>
            </>
          ) : null}
          {row.task === "post_meeting_email" ? (
            <Button variant="secondary" onClick={onMarkPostMeetingEmail}>
              Mark email sent
            </Button>
          ) : null}
          {row.task === "proposal" ? (
            <Button variant="secondary" onClick={onMarkProposal}>
              Mark proposal made
            </Button>
          ) : null}
          {row.task === "awaiting_reply" ? (
            <Button variant="secondary" onClick={onFollowUpAgain}>
              Follow up again
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function AwaitingRow({
  lead,
  onFollowUpAgain,
}: {
  lead: TodoAwaitingRow;
  onFollowUpAgain: () => void;
}) {
  const awaitingDays = daysAwaitingResponse(lead);

  return (
    <li className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/leads?lead=${lead.id}`}
            className="text-sm font-medium text-[var(--foreground)] hover:underline"
          >
            {contactDisplayName(lead.contact)}
          </Link>
          <p className="text-xs text-[var(--muted)]">
            {lead.contact.company || "—"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
              {LEAD_STATUS_LABELS[lead.status]}
            </span>
            <span className="text-[10px] text-[var(--muted)]">
              {awaitingDays ?? 0}d awaiting
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1">
          <Button variant="secondary" onClick={onFollowUpAgain}>
            Follow up again
          </Button>
        </div>
      </div>
    </li>
  );
}

export function TodoPage() {
  const [leads, setLeads] = useState<LeadWithContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCloseId, setPendingCloseId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLeads(await fetchLeadsForBoard());
    } catch {
      setLeads([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("todo-queue-changed", refresh);
    return () => window.removeEventListener("todo-queue-changed", refresh);
  }, [load]);

  const queue = useMemo(() => buildTodoQueue(leads), [leads]);

  const patchLead = (leadId: string, patch: Partial<LeadWithContact>) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, ...patch } : l))
    );
  };

  const closeLead = async (leadId: string, reason: ClosedReason) => {
    const { supabase } = await import("@/lib/supabase");
    await supabase
      .from("leads")
      .update({ status: "closed", closed_reason: reason })
      .eq("id", leadId);
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    setPendingCloseId(null);
    window.dispatchEvent(new Event("todo-queue-changed"));
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-violet-50/40 via-white to-amber-50/30">
      <PageHeader
        title="To-do"
        description={`${queue.total} item${queue.total !== 1 ? "s" : ""} need attention`}
      />

      <div className="space-y-10 px-8 pb-12">
        <ManualTodoPanel />

        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            Reach out
            <span className="ml-2 font-normal text-[var(--muted)]">
              ({queue.reachOut.length})
            </span>
          </h2>
          {loading ? (
            <p className="text-sm text-[var(--muted)]">Loading…</p>
          ) : queue.reachOut.length === 0 ? (
            <p className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-8 text-center text-sm text-[var(--muted)]">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="space-y-2">
              {queue.reachOut.map((row) => (
                <div key={`${row.id}-${row.task}`}>
                  <ReachOutRow
                    row={row}
                    onMarkFollowup={async () => {
                      const { lead: updated, error } = await rpcLogFollowup(
                        row.id
                      );
                      if (error) alert(error);
                      else if (updated) {
                        patchLead(row.id, {
                          last_followup_at: updated.last_followup_at,
                          next_followup_at: updated.next_followup_at,
                          followup_count: updated.followup_count,
                          awaiting_response_since:
                            updated.awaiting_response_since,
                        });
                      }
                      void load();
                    }}
                    onSnooze={async () => {
                      const res = await snoozeFollowupDays(
                        row.id,
                        SNOOZE_PUSH_DAYS
                      );
                      if ("error" in res) alert(res.error);
                      else
                        patchLead(row.id, {
                          next_followup_at: res.next_followup_at,
                        });
                      void load();
                    }}
                    onMarkPostMeetingEmail={async () => {
                      const err = await setPostMeetingEmailSent(row.id);
                      if (err) alert(err);
                      else patchLead(row.id, { post_meeting_email_sent: true });
                      void load();
                    }}
                    onMarkProposal={async () => {
                      const err = await setProposalMade(row.id, true);
                      if (err) alert(err);
                      else patchLead(row.id, { proposal_made: true });
                      void load();
                    }}
                    onFollowUpAgain={async () => {
                      const { error } = await rpcLogFollowup(row.id);
                      if (error) alert(error);
                      void load();
                    }}
                    onCloseOut={() => setPendingCloseId(row.id)}
                  />
                  {pendingCloseId === row.id ? (
                    <div className="mt-1 flex flex-wrap gap-1 px-4">
                      {(
                        ["won", "lost", "non_fit", "ghosted"] as ClosedReason[]
                      ).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => void closeLead(row.id, r)}
                          className="rounded border border-[var(--border)] px-2 py-1 text-xs"
                        >
                          {CLOSED_REASON_LABELS[r]}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            Awaiting reply
            <span className="ml-2 font-normal text-[var(--muted)]">
              ({queue.awaiting.length})
            </span>
          </h2>
          {loading ? (
            <p className="text-sm text-[var(--muted)]">Loading…</p>
          ) : queue.awaiting.length === 0 ? (
            <p className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-8 text-center text-sm text-[var(--muted)]">
              No leads awaiting a reply.
            </p>
          ) : (
            <ul className="space-y-2">
              {(queue.awaiting as TodoAwaitingRow[]).map((lead) => (
                <AwaitingRow
                  key={lead.id}
                  lead={lead}
                  onFollowUpAgain={async () => {
                    const { error } = await rpcLogFollowup(lead.id);
                    if (error) alert(error);
                    void load();
                  }}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

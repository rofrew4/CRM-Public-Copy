"use client";

import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import type { LeadWithContact } from "@/lib/leads-api";
import type { LeadStatus } from "@/lib/types";
import { LEAD_STATUS_LABELS } from "@/lib/types";
import { isSnoozed, sortLeadsByUrgency } from "@/lib/followup";
import { KANBAN_COLUMN_STYLES } from "@/lib/lead-kanban";
import { cn } from "@/lib/utils";
import { LeadKanbanCard } from "@/components/leads/LeadKanbanCard";

type CardHandlers = Omit<
  React.ComponentProps<typeof LeadKanbanCard>,
  "lead" | "columnStatus" | "dimmed" | "showClosedPicker"
>;

function DraggableCard({
  lead,
  columnStatus,
  dimmed,
  showClosedPicker,
  handlers,
}: {
  lead: LeadWithContact;
  columnStatus: LeadStatus;
  dimmed?: boolean;
  showClosedPicker?: boolean;
  handlers: CardHandlers;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: lead.id,
      data: { type: "card", status: columnStatus },
    });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        opacity: isDragging ? 0.4 : 1,
      }}
      {...listeners}
      {...attributes}
    >
      <LeadKanbanCard
        lead={lead}
        columnStatus={columnStatus}
        dimmed={dimmed}
        showClosedPicker={showClosedPicker}
        {...handlers}
      />
    </div>
  );
}

export function KanbanColumn({
  status,
  leads,
  snoozedExpanded,
  onToggleSnoozed,
  pendingClosedId,
  getHandlers,
  emptyHint,
}: {
  status: LeadStatus;
  leads: LeadWithContact[];
  snoozedExpanded: boolean;
  onToggleSnoozed: () => void;
  pendingClosedId: string | null;
  getHandlers: (lead: LeadWithContact) => CardHandlers;
  emptyHint?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: "column", status },
  });

  const visible = leads.filter((l) => !isSnoozed(l));
  const snoozed = leads.filter((l) => isSnoozed(l));
  const sortedVisible = sortLeadsByUrgency(visible);
  const sortedSnoozed = sortLeadsByUrgency(snoozed);
  const styles = KANBAN_COLUMN_STYLES[status];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex max-h-[calc(100dvh-11rem)] w-60 shrink-0 flex-col rounded-lg",
        styles.columnBg,
        isOver && "ring-2 ring-gray-400"
      )}
    >
      <div className="shrink-0 border-b border-gray-200/60 px-3 py-2.5">
        <h3 className={cn("text-xs font-semibold", styles.headerText)}>
          {LEAD_STATUS_LABELS[status]}
        </h3>
        <span className="text-xs text-gray-400">{visible.length}</span>
      </div>
      <div className="flex min-h-48 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {sortedVisible.length === 0 && snoozed.length === 0 && emptyHint ? (
          <p className="px-1 py-6 text-center text-[11px] text-[var(--muted)]">
            {emptyHint}
          </p>
        ) : null}
        {sortedVisible.map((lead) => (
          <DraggableCard
            key={lead.id}
            lead={lead}
            columnStatus={status}
            showClosedPicker={pendingClosedId === lead.id}
            handlers={getHandlers(lead)}
          />
        ))}
        {snoozedExpanded
          ? sortedSnoozed.map((lead) => (
              <DraggableCard
                key={lead.id}
                lead={lead}
                columnStatus={status}
                dimmed
                showClosedPicker={pendingClosedId === lead.id}
                handlers={getHandlers(lead)}
              />
            ))
          : null}
        <div
          className={cn(
            "min-h-10 shrink-0 rounded-md border border-dashed border-transparent",
            isOver && "border-gray-300 bg-white/40"
          )}
          aria-hidden
        />
      </div>
      {snoozed.length > 0 ? (
        <button
          type="button"
          onClick={onToggleSnoozed}
          className="border-t border-[var(--border)] px-3 py-2 text-left text-[11px] text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          {snoozed.length} snoozed — {snoozedExpanded ? "hide" : "show"}
        </button>
      ) : null}
    </div>
  );
}

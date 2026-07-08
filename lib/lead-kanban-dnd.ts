import type {
  CollisionDetection,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { closestCorners, pointerWithin } from "@dnd-kit/core";
import type { LeadWithContact } from "@/lib/leads-api";
import type { LeadStatus } from "@/lib/types";
import { LEAD_STATUSES } from "@/lib/types";

export function isLeadStatus(id: unknown): id is LeadStatus {
  return typeof id === "string" && LEAD_STATUSES.includes(id as LeadStatus);
}

/** Prefer the column under the pointer — works when a column is full of cards. */
export const kanbanCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  const columnFromPointer = pointerCollisions.find((c) => isLeadStatus(c.id));
  if (columnFromPointer) return [columnFromPointer];

  const cornerCollisions = closestCorners(args);
  const columnFromCorners = cornerCollisions.find((c) => isLeadStatus(c.id));
  if (columnFromCorners) return [columnFromCorners];

  return cornerCollisions;
};

type DropData = {
  type?: "column" | "card";
  status?: LeadStatus;
};

export function resolveKanbanDropStatus(
  over: DragOverEvent["over"] | DragEndEvent["over"],
  leads: LeadWithContact[]
): LeadStatus | null {
  if (!over) return null;

  const data = over.data.current as DropData | undefined;
  if (data?.type === "column" && data.status && isLeadStatus(data.status)) {
    return data.status;
  }
  if (data?.type === "card" && data.status && isLeadStatus(data.status)) {
    return data.status;
  }

  if (isLeadStatus(over.id)) return over.id;

  const overLead = leads.find((l) => l.id === over.id);
  if (overLead) return overLead.status;

  return null;
}

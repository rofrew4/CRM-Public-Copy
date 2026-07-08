import type { LeadStatus } from "@/lib/types";

/** Rainbow column styling — each pipeline stage gets its own color. */
export const KANBAN_COLUMN_STYLES: Record<
  LeadStatus,
  { columnBg: string; headerText: string; cardBorder: string }
> = {
  responded: {
    columnBg: "bg-red-50/90",
    headerText: "text-red-900",
    cardBorder: "border-2 border-red-400",
  },
  meeting_requested: {
    columnBg: "bg-orange-50/90",
    headerText: "text-orange-900",
    cardBorder: "border-2 border-orange-400",
  },
  meeting_booked: {
    columnBg: "bg-yellow-50/90",
    headerText: "text-yellow-900",
    cardBorder: "border-2 border-yellow-400",
  },
  meeting_taken: {
    columnBg: "bg-green-50/90",
    headerText: "text-green-900",
    cardBorder: "border-2 border-green-500",
  },
  "2nd_call_booked": {
    columnBg: "bg-blue-50/90",
    headerText: "text-blue-900",
    cardBorder: "border-2 border-blue-400",
  },
  proposal_sent: {
    columnBg: "bg-violet-50/90",
    headerText: "text-violet-900",
    cardBorder: "border-2 border-violet-400",
  },
  closed: {
    columnBg: "bg-slate-100",
    headerText: "text-slate-800",
    cardBorder: "border-2 border-slate-400",
  },
};

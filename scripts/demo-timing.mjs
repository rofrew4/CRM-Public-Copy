/**
 * Relative date recipes for demo leads — keeps kanban highlights stable over time.
 * Each active lead is assigned a fixed "slot" (overdue, due today, waiting, snoozed, etc.)
 * and dates are recomputed from whenever you run seed or refresh.
 */

const MS_DAY = 86_400_000;

export function tsFrom(base, days) {
  return new Date(base.getTime() + days * MS_DAY).toISOString();
}

export function dateFrom(base, days) {
  return tsFrom(base, days).slice(0, 10);
}

/**
 * Per-lead timing overrides (days relative to `base`).
 * Booleans/flags are static; only dates roll forward on refresh.
 */
export const DEMO_LEAD_TIMING = {
  "b1000001-0000-4000-8000-000000000001": {
    label: "waiting follow-up",
    status_entered_at: -5,
    next_followup_at: 2,
    last_followup_at: -4,
  },
  "b1000001-0000-4000-8000-000000000002": {
    label: "due today",
    status_entered_at: -3,
    next_followup_at: 0,
  },
  "b1000001-0000-4000-8000-000000000003": {
    label: "awaiting reply (proposal stage)",
    status_entered_at: -12,
    next_followup_at: 4,
    last_followup_at: -6,
    awaiting_response_since: -3,
  },
  "b1000001-0000-4000-8000-000000000004": {
    label: "proposal needed",
    status_entered_at: -8,
    next_followup_at: 3,
    last_followup_at: -2,
    proposal_made: false,
    post_meeting_email_sent: true,
  },
  "b1000001-0000-4000-8000-000000000005": {
    label: "waiting this week",
    status_entered_at: -2,
    next_followup_at: 3,
  },
  "b1000001-0000-4000-8000-000000000007": {
    label: "post-meeting email pending",
    status_entered_at: -2,
    next_followup_at: 1,
    post_meeting_email_sent: false,
  },
  "b1000001-0000-4000-8000-000000000008": {
    label: "overdue follow-up",
    status_entered_at: -14,
    next_followup_at: -2,
    last_followup_at: -5,
    proposal_made: true,
    post_meeting_email_sent: true,
  },
  "b1000001-0000-4000-8000-000000000009": {
    label: "awaiting nudge",
    status_entered_at: -6,
    next_followup_at: 3,
    last_followup_at: -1,
    awaiting_response_since: -3,
  },
  "b1000001-0000-4000-8000-00000000000a": {
    label: "no follow-up set",
    status_entered_at: -5,
    next_followup_at: null,
  },
  "b1000001-0000-4000-8000-00000000000b": {
    label: "neutral after post-meeting",
    status_entered_at: -7,
    next_followup_at: 5,
    post_meeting_email_sent: true,
  },
  "b1000001-0000-4000-8000-00000000000c": {
    label: "no-show rescheduled",
    status_entered_at: -3,
    next_followup_at: 4,
    noshow_count: 1,
  },
  "b1000001-0000-4000-8000-000000000013": {
    label: "proposal needed (agency)",
    status_entered_at: -4,
    next_followup_at: 6,
    proposal_made: false,
    post_meeting_email_sent: true,
  },
  "b1000001-0000-4000-8000-000000000014": {
    label: "waiting + proposal todo",
    status_entered_at: -9,
    next_followup_at: 2,
    last_followup_at: -3,
    proposal_made: false,
    post_meeting_email_sent: true,
  },
  "b1000001-0000-4000-8000-000000000015": {
    label: "due tomorrow",
    status_entered_at: -11,
    next_followup_at: 1,
    last_followup_at: -7,
    proposal_made: true,
    post_meeting_email_sent: true,
  },
  "b1000001-0000-4000-8000-000000000016": {
    label: "snoozed (dimmed)",
    status_entered_at: -1,
    next_followup_at: 18,
  },
  "b1000001-0000-4000-8000-000000000017": {
    label: "waiting meeting request",
    status_entered_at: -4,
    next_followup_at: 2,
  },
  "b1000001-0000-4000-8000-000000000018": {
    label: "meeting booked — neutral",
    status_entered_at: -2,
    next_followup_at: 5,
  },
};

export const DEMO_MEETING_BOOKED_DAYS = {
  "b1000001-0000-4000-8000-000000000001": -5,
  "b1000001-0000-4000-8000-000000000002": 0,
  "b1000001-0000-4000-8000-000000000003": -28,
  "b1000001-0000-4000-8000-000000000004": -8,
  "b1000001-0000-4000-8000-000000000005": -1,
  "b1000001-0000-4000-8000-000000000006": -48,
  "b1000001-0000-4000-8000-000000000007": -3,
  "b1000001-0000-4000-8000-000000000008": -18,
  "b1000001-0000-4000-8000-000000000009": -4,
  "b1000001-0000-4000-8000-00000000000b": -14,
  "b1000001-0000-4000-8000-00000000000c": -7,
  "b1000001-0000-4000-8000-00000000000d": -21,
  "b1000001-0000-4000-8000-00000000000e": -38,
  "b1000001-0000-4000-8000-00000000000f": -20,
  "b1000001-0000-4000-8000-000000000010": -35,
  "b1000001-0000-4000-8000-000000000011": -42,
  "b1000001-0000-4000-8000-000000000012": -12,
  "b1000001-0000-4000-8000-000000000013": -6,
  "b1000001-0000-4000-8000-000000000014": -10,
  "b1000001-0000-4000-8000-000000000015": -16,
  "b1000001-0000-4000-8000-000000000017": -9,
  "b1000001-0000-4000-8000-000000000018": -2,
};

/** Apply rolling date fields to a lead row (seed or refresh). */
export function applyLeadTiming(lead, base = new Date()) {
  const recipe = DEMO_LEAD_TIMING[lead.id];
  if (!recipe) return lead;

  const patch = { ...lead };
  if (recipe.status_entered_at != null) {
    patch.status_entered_at = tsFrom(base, recipe.status_entered_at);
  }
  if ("next_followup_at" in recipe) {
    patch.next_followup_at =
      recipe.next_followup_at == null
        ? null
        : tsFrom(base, recipe.next_followup_at);
  }
  if (recipe.last_followup_at != null) {
    patch.last_followup_at = tsFrom(base, recipe.last_followup_at);
  }
  if ("awaiting_response_since" in recipe) {
    patch.awaiting_response_since =
      recipe.awaiting_response_since == null
        ? null
        : tsFrom(base, recipe.awaiting_response_since);
  }
  if ("proposal_made" in recipe) patch.proposal_made = recipe.proposal_made;
  if ("post_meeting_email_sent" in recipe) {
    patch.post_meeting_email_sent = recipe.post_meeting_email_sent;
  }
  if ("noshow_count" in recipe) patch.noshow_count = recipe.noshow_count;
  return patch;
}

export function buildMeetingBookedRows(base = new Date()) {
  return Object.entries(DEMO_MEETING_BOOKED_DAYS).map(([lead_id, days]) => ({
    lead_id,
    booked_on: dateFrom(base, days),
  }));
}

export function buildDailyVolumeRows(base = new Date()) {
  const rows = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(base.getTime() - i * MS_DAY);
    const dow = d.getUTCDay();
    const day = d.getUTCDate();
    const week = Math.floor(d.getTime() / (MS_DAY * 7));
    const total_volume =
      dow === 0 || dow === 6
        ? 12 + (day % 8)
        : 72 + (day % 25) + (week % 5) * 3;
    rows.push({ log_date: d.toISOString().slice(0, 10), total_volume });
  }
  return rows;
}

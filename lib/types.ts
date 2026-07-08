export type ContactAssignment =
  | "unassigned"
  | "instantly"
  | "smartlead"
  | "personal";

export type ContactStatus =
  | "sourced"
  | "contacted"
  | "responded"
  | "qualified"
  | "disqualified";

export type EmailAccountStatus = "active" | "warming" | "paused" | "dead";

export type EmailInboxUse = "personal" | "instantly" | "smartlead";

export const EMAIL_INBOX_USES: EmailInboxUse[] = [
  "personal",
  "instantly",
  "smartlead",
];

export type ActiveLeadStatus =
  | "responded"
  | "meeting_requested"
  | "meeting_booked"
  | "meeting_taken"
  | "2nd_call_booked"
  | "proposal_sent";

export type LeadStatus = ActiveLeadStatus | "closed";

export type ClosedReason = "won" | "lost" | "non_fit" | "ghosted";

export type CloseLostReason =
  | "wrong_fit"
  | "no_budget"
  | "ghosted"
  | "went_with_competitor"
  | "timing"
  | "other";

export interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  company: string | null;
  title: string | null;
  state: string | null;
  vertical: string | null;
  assignment: ContactAssignment;
  status: ContactStatus;
  sourced_date: string | null;
  last_contacted_date: string | null;
  company_domain: string | null;
  phone: string | null;
  linkedin_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailAccount {
  id: string;
  email_address: string;
  provider: string | null;
  purchase_date: string | null;
  monthly_cost: number | null;
  daily_volume: number | null;
  inbox_use: EmailInboxUse;
  status: EmailAccountStatus;
  last_mailreach_score: number | null;
  last_mailreach_notes: string | null;
  last_mailreach_test_date: string | null;
  mailreach_test_url: string | null;
  password: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailySendingVolume {
  log_date: string;
  total_volume: number;
  updated_at: string;
}

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  priority: boolean;
  position: number;
  created_at: string;
}

export interface Template {
  id: string;
  name: string;
  subject_line: string;
  body: string;
  created_at: string;
  last_used_date: string | null;
}

export interface Lead {
  id: string;
  contact_id: string;
  status: LeadStatus;
  notes: string | null;
  meeting_transcript: string | null;
  meeting_transcript_path: string | null;
  /** @deprecated Use next_followup_at */
  follow_up_date: string | null;
  next_followup_at: string | null;
  last_followup_at: string | null;
  followup_count: number;
  followup_cadence_days: number | null;
  noshow_count: number;
  proposal_made: boolean;
  post_meeting_email_sent: boolean;
  awaiting_response_since: string | null;
  closed_reason: ClosedReason | null;
  deal_value: number | null;
  close_lost_reason: CloseLostReason | null;
  personal_email_account_id: string | null;
  created_at: string;
  /** When the lead entered its current pipeline stage. */
  status_entered_at: string;
  updated_at: string;
  contact?: Contact;
}

export type LeadWithContact = Lead & { contact: Contact };

export interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: string;
  description: string | null;
  created_at: string;
}

export interface LeadMeetingBookedEvent {
  lead_id: string;
  booked_on: string;
  created_at: string;
  lead?: {
    contact_id: string;
    contact:
      | Pick<Contact, "first_name" | "last_name" | "company" | "email">
      | Pick<Contact, "first_name" | "last_name" | "company" | "email">[]
      | null;
  } | null;
}

export const LEAD_STATUSES: LeadStatus[] = [
  "responded",
  "meeting_requested",
  "meeting_booked",
  "meeting_taken",
  "2nd_call_booked",
  "proposal_sent",
  "closed",
];

export const KANBAN_COLUMNS: ActiveLeadStatus[] = [
  "responded",
  "meeting_requested",
  "meeting_booked",
  "meeting_taken",
  "2nd_call_booked",
  "proposal_sent",
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  responded: "Responded",
  meeting_requested: "Meeting Requested",
  meeting_booked: "Meeting Booked",
  meeting_taken: "Meeting Taken",
  "2nd_call_booked": "2nd Call Booked",
  proposal_sent: "Proposal Sent",
  closed: "Closed",
};

export const CLOSED_REASON_LABELS: Record<ClosedReason, string> = {
  won: "Won",
  lost: "Lost",
  non_fit: "Non-fit",
  ghosted: "Ghosted",
};

export const CONTACT_ASSIGNMENTS: ContactAssignment[] = [
  "unassigned",
  "instantly",
  "smartlead",
  "personal",
];

export const CLOSE_LOST_REASONS: { value: CloseLostReason; label: string }[] =
  [
    { value: "wrong_fit", label: "Wrong fit" },
    { value: "no_budget", label: "No budget" },
    { value: "ghosted", label: "Ghosted" },
    { value: "went_with_competitor", label: "Went with competitor" },
    { value: "timing", label: "Timing" },
    { value: "other", label: "Other" },
  ];

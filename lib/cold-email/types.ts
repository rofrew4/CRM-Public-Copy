export type CampaignStatus = "active" | "paused" | "draft" | "completed";
export type EnrollmentStatus = "active" | "replied" | "completed" | "paused";

export interface SendingAccount {
  id: string;
  email: string;
  displayName: string;
  dailyCap: number;
  sentToday: number;
  active: boolean;
  warmup: boolean;
  connected: boolean;
}

export interface ListContact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  title?: string;
}

export interface ContactList {
  id: string;
  name: string;
  description: string;
  contactIds: string[];
  createdAt: string;
}

export interface CampaignStep {
  id: string;
  order: number;
  delayDays: number;
  subject: string;
  body: string;
}

export interface CampaignEnrollment {
  id: string;
  contactId: string;
  status: EnrollmentStatus;
  stepIndex: number;
  lastTouchedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  listId: string;
  sendWindowStart: string;
  sendWindowEnd: string;
  enrolled: number;
  sent: number;
  replied: number;
  opened: number;
  steps: CampaignStep[];
  enrollments: CampaignEnrollment[];
}

export interface InboxMessage {
  id: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  snippet: string;
  body: string;
  receivedAt: string;
  unread: boolean;
  campaignId: string | null;
  contactId: string | null;
  company: string;
  sentiment: "interested" | "not_interested" | "ooo" | "meeting" | "neutral";
}

export interface WarmupActivity {
  id: string;
  type: "outbound" | "reply";
  fromEmail: string;
  toEmail: string;
  subject: string;
  at: string;
}

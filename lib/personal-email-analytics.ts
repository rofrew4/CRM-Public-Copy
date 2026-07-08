import type { EmailAccount, Lead } from "@/lib/types";

export interface PersonalEmailLeadStats {
  accountId: string;
  emailAddress: string;
  leadCount: number;
  activePipeline: number;
  closedWon: number;
  closedLost: number;
  dealValue: number;
}

export function personalEmailLeadStats(
  accounts: EmailAccount[],
  leads: Lead[]
): PersonalEmailLeadStats[] {
  return accounts
    .map((account) => {
      const accountLeads = leads.filter(
        (l) => l.personal_email_account_id === account.id
      );
      return {
        accountId: account.id,
        emailAddress: account.email_address,
        leadCount: accountLeads.length,
        activePipeline: accountLeads.filter((l) => l.status !== "closed")
          .length,
        closedWon: accountLeads.filter(
          (l) => l.status === "closed" && l.closed_reason === "won"
        ).length,
        closedLost: accountLeads.filter(
          (l) => l.status === "closed" && l.closed_reason !== "won"
        ).length,
        dealValue: accountLeads.reduce(
          (sum, l) => sum + (l.deal_value ?? 0),
          0
        ),
      };
    })
    .filter((s) => s.leadCount > 0)
    .sort((a, b) => b.leadCount - a.leadCount);
}

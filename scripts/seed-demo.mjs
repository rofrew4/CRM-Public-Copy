/**
 * Load fictional demo data via the Supabase API.
 * Use this when pasting seed_demo.sql in the SQL Editor fails partway through.
 *
 * Usage: npm run seed
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  applyLeadTiming,
  buildDailyVolumeRows,
  buildMeetingBookedRows,
  tsFrom,
} from "./demo-timing.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const path = resolve(root, ".env.local");
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local optional if vars already set
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(url, key);
const base = new Date();
const ago = (days) => tsFrom(base, -days);
const ahead = (days) => tsFrom(base, days);

async function clearTable(table, column = "id", sentinel = "00000000-0000-0000-0000-000000000000") {
  const { error } = await sb.from(table).delete().neq(column, sentinel);
  if (error && !error.message.includes("0 rows")) {
    throw new Error(`${table} clear: ${error.message}`);
  }
}

async function insert(table, rows, label) {
  if (!rows.length) return;
  const { error } = await sb.from(table).insert(rows);
  if (error) throw new Error(`${label ?? table} insert: ${error.message}`);
  console.log(`  ${label ?? table}: ${rows.length} rows`);
}

async function main() {
  console.log("Clearing demo tables...");
  await clearTable("outreach_log");
  await clearTable("lead_activity");
  await clearTable("lead_meeting_booked_events", "lead_id");
  await clearTable("leads");
  await clearTable("contacts");
  await clearTable("templates");
  await clearTable("todos");
  await clearTable("daily_sending_volume", "log_date", "1970-01-01");
  await clearTable("email_accounts");

  console.log("Inserting demo data...");

  await insert("email_accounts", [
    { id: "a1000001-0000-4000-8000-000000000001", email_address: "alex.demo@northwind-outreach.io", domain: "northwind-outreach.io", provider: "Google Workspace", purchase_date: "2025-01-15", monthly_cost: 12, daily_volume: 25, inbox_use: "personal", status: "active", last_mailreach_score: 92, last_mailreach_test_date: ago(3), last_mailreach_notes: "Inbox healthy — demo data only" },
    { id: "a1000001-0000-4000-8000-000000000002", email_address: "jordan.sales@northwind-outreach.io", domain: "northwind-outreach.io", provider: "Google Workspace", purchase_date: "2025-02-20", monthly_cost: 12, daily_volume: 20, inbox_use: "personal", status: "active", last_mailreach_score: 89, last_mailreach_test_date: ago(5), last_mailreach_notes: "Secondary personal inbox" },
    { id: "a1000001-0000-4000-8000-000000000003", email_address: "campaigns@brightpath-demo.com", domain: "brightpath-demo.com", provider: "Microsoft 365", purchase_date: "2025-02-01", monthly_cost: 10, daily_volume: 40, inbox_use: "instantly", status: "warming", last_mailreach_score: 78, last_mailreach_test_date: ago(1), last_mailreach_notes: "Still warming" },
    { id: "a1000001-0000-4000-8000-000000000004", email_address: "sequences@brightpath-demo.com", domain: "brightpath-demo.com", provider: "Microsoft 365", purchase_date: "2025-03-05", monthly_cost: 10, daily_volume: 35, inbox_use: "instantly", status: "active", last_mailreach_score: 85, last_mailreach_test_date: ago(2), last_mailreach_notes: "Primary Instantly inbox" },
    { id: "a1000001-0000-4000-8000-000000000005", email_address: "outbound@harborline-demo.com", domain: "harborline-demo.com", provider: "Google Workspace", purchase_date: "2025-03-10", monthly_cost: 12, daily_volume: 30, inbox_use: "smartlead", status: "active", last_mailreach_score: 88, last_mailreach_test_date: ago(4), last_mailreach_notes: "Demo Smartlead inbox" },
    { id: "a1000001-0000-4000-8000-000000000006", email_address: "growth@harborline-demo.com", domain: "harborline-demo.com", provider: "Google Workspace", purchase_date: "2025-04-01", monthly_cost: 12, daily_volume: 28, inbox_use: "smartlead", status: "warming", last_mailreach_score: 72, last_mailreach_test_date: ago(6), last_mailreach_notes: "Week 3 warmup" },
    { id: "a1000001-0000-4000-8000-000000000007", email_address: "ops@atlas-demo-mail.com", domain: "atlas-demo-mail.com", provider: "Google Workspace", purchase_date: "2025-01-28", monthly_cost: 12, daily_volume: 22, inbox_use: "instantly", status: "paused", last_mailreach_score: 81, last_mailreach_test_date: ago(14), last_mailreach_notes: "Paused DNS migration" },
    { id: "a1000001-0000-4000-8000-000000000008", email_address: "hello@vertex-demo.io", domain: "vertex-demo.io", provider: "Google Workspace", purchase_date: "2024-11-10", monthly_cost: 12, daily_volume: 18, inbox_use: "personal", status: "warming", last_mailreach_score: 65, last_mailreach_test_date: ago(2), last_mailreach_notes: "Cybersecurity vertical" },
    { id: "a1000001-0000-4000-8000-000000000009", email_address: "legacy@lumen-demo.com", domain: "lumen-demo.com", provider: "Zoho Mail", purchase_date: "2024-06-01", monthly_cost: 8, daily_volume: 0, inbox_use: "smartlead", status: "dead", last_mailreach_score: 41, last_mailreach_test_date: ago(45), last_mailreach_notes: "Retired inbox" },
    { id: "a1000001-0000-4000-8000-00000000000a", email_address: "team@summit-edu-demo.org", domain: "summit-edu-demo.org", provider: "Microsoft 365", purchase_date: "2025-05-01", monthly_cost: 10, daily_volume: 15, inbox_use: "personal", status: "paused", last_mailreach_score: 90, last_mailreach_test_date: ago(8), last_mailreach_notes: "EdTech campaign on hold" },
  ]);

  const contacts = [
    ["c1000001-0000-4000-8000-000000000001", "Morgan", "Reed", "morgan.reed@northwind-logistics.com", "Northwind Logistics", "northwind-logistics.com", "VP Operations", "IL", "555-0101", "Logistics", "Apollo", "personal", "responded", 21, 2, "Met at Manifest conference"],
    ["c1000001-0000-4000-8000-000000000002", "Jordan", "Blake", "jordan.blake@brightpath-health.com", "Brightpath Health", "brightpath-health.com", "Director of Growth", "TX", "555-0102", "Healthcare SaaS", "LinkedIn", "instantly", "responded", 18, 5, "HIPAA compliance required"],
    ["c1000001-0000-4000-8000-000000000003", "Casey", "Nguyen", "casey.nguyen@harborline-finance.com", "Harborline Finance", "harborline-finance.com", "Head of RevOps", "CA", "555-0103", "Fintech", "Referral", "smartlead", "qualified", 30, 1, "Champion internally"],
    ["c1000001-0000-4000-8000-000000000004", "Taylor", "Kim", "taylor.kim@atlas-manufacturing.com", "Atlas Manufacturing", "atlas-manufacturing.com", "Plant Manager", "OH", "555-0105", "Manufacturing", "Cold email", "personal", "responded", 45, 3, "IT director joining next call"],
    ["c1000001-0000-4000-8000-000000000005", "Quinn", "Foster", "quinn.foster@vertex-security.com", "Vertex Security", "vertex-security.com", "CEO", "WA", "555-0107", "Cybersecurity", "Inbound", "personal", "responded", 14, 4, "Found via podcast"],
    ["c1000001-0000-4000-8000-000000000006", "Avery", "Chen", "avery.chen@lumen-retail.com", "Lumen Retail", "lumen-retail.com", "CMO", "FL", "555-0106", "Retail", "Apollo", "instantly", "disqualified", 60, 20, "Budget freeze"],
    ["c1000001-0000-4000-8000-000000000007", "Dana", "Walsh", "dana.walsh@pioneer-hr.com", "Pioneer HR", "pioneer-hr.com", "VP People", "MA", "555-0110", "HR Tech", "LinkedIn", "personal", "responded", 25, 1, "Needs post-meeting recap"],
    ["c1000001-0000-4000-8000-000000000008", "Eli", "Martinez", "eli.martinez@cloudbridge.io", "Cloudbridge", "cloudbridge.io", "CTO", "CO", "555-0111", "Cloud Infrastructure", "Referral", "personal", "qualified", 12, 0, "Overdue follow-up"],
    ["c1000001-0000-4000-8000-000000000009", "Finn", "O'Brien", "finn.obrien@sterling-legal.com", "Sterling Legal Partners", "sterling-legal.com", "Managing Partner", "NY", "555-0112", "Legal", "Cold email", "personal", "responded", 8, 2, "Awaiting pricing reply"],
    ["c1000001-0000-4000-8000-00000000000a", "Gray", "Sato", "gray.sato@nexgen-biotech.com", "NexGen Biotech", "nexgen-biotech.com", "Director of Ops", "CA", "555-0113", "Biotech", "Conference", "smartlead", "responded", 6, 3, "No follow-up date set"],
    ["c1000001-0000-4000-8000-00000000000b", "Harper", "Jones", "harper.jones@ridgeline-construction.com", "Ridgeline Construction", "ridgeline-construction.com", "COO", "AZ", "555-0114", "Construction", "Apollo", "personal", "qualified", 35, 7, "Post-meeting email sent"],
    ["c1000001-0000-4000-8000-00000000000c", "Indigo", "Rossi", "indigo.rossi@meridian-media.com", "Meridian Media", "meridian-media.com", "Head of Sales", "IL", "555-0115", "Media", "LinkedIn", "instantly", "responded", 20, 10, "No-show rescheduled"],
    ["c1000001-0000-4000-8000-00000000000d", "Jules", "Park", "jules.park@quantum-insurance.com", "Quantum Insurance", "quantum-insurance.com", "Chief Actuary", "CT", "555-0116", "Insurance", "Referral", "personal", "qualified", 50, 2, "Closed won"],
    ["c1000001-0000-4000-8000-00000000000e", "Kai", "Andersson", "kai.andersson@nordic-foods.com", "Nordic Foods Co", "nordic-foods.com", "Supply Chain Director", "MN", "555-0117", "Food & Beverage", "Cold email", "smartlead", "responded", 40, 30, "Ghosted after proposal"],
    ["c1000001-0000-4000-8000-00000000000f", "Logan", "Brooks", "logan.brooks@apex-realestate.com", "Apex Real Estate", "apex-realestate.com", "Broker Owner", "FL", "555-0118", "Real Estate", "Apollo", "instantly", "disqualified", 22, 15, "Wrong ICP"],
    ["c1000001-0000-4000-8000-000000000010", "Morgan", "Hayes", "morgan.hayes@silverline-saas.com", "Silverline SaaS", "silverline-saas.com", "CRO", "UT", "555-0119", "B2B SaaS", "Inbound", "personal", "qualified", 55, 5, "Lost to competitor"],
    ["c1000001-0000-4000-8000-000000000011", "Noah", "Singh", "noah.singh@horizon-logistics.com", "Horizon Logistics", "horizon-logistics.com", "Director of Fleet", "GA", "555-0120", "Logistics", "LinkedIn", "smartlead", "responded", 28, 8, "No budget until Q4"],
    ["c1000001-0000-4000-8000-000000000012", "Parker", "Liu", "parker.liu@stellar-pharma.com", "Stellar Pharma", "stellar-pharma.com", "VP Commercial", "NJ", "555-0121", "Pharma", "Conference", "personal", "qualified", 70, 4, "Enterprise win"],
    ["c1000001-0000-4000-8000-000000000013", "Reese", "Dubois", "reese.dubois@atelier-design.com", "Atelier Design Studio", "atelier-design.com", "Creative Director", "OR", "555-0122", "Creative Agency", "Cold email", "instantly", "responded", 16, 1, "White-label interest"],
    ["c1000001-0000-4000-8000-000000000014", "Sage", "Okonkwo", "sage.okonkwo@terra-energy.com", "Terra Energy", "terra-energy.com", "Procurement Lead", "TX", "555-0123", "Energy", "Apollo", "smartlead", "responded", 19, 2, "Multi-site rollout"],
    ["c1000001-0000-4000-8000-000000000015", "Tatum", "Reed", "tatum.reed@blueoak-edu.com", "Blue Oak Education", "blueoak-edu.com", "Superintendent", "NC", "555-0124", "EdTech", "Referral", "personal", "qualified", 33, 6, "Proposal out"],
    ["c1000001-0000-4000-8000-000000000016", "Uma", "Patel", "uma.patel@velocity-fintech.com", "Velocity Fintech", "velocity-fintech.com", "Head of Partnerships", "CA", "555-0125", "Fintech", "LinkedIn", "personal", "responded", 9, 0, "Partnership motion"],
    ["c1000001-0000-4000-8000-000000000017", "Vale", "Kimura", "vale.kimura@pacific-shipping.com", "Pacific Shipping Group", "pacific-shipping.com", "Operations Manager", "WA", "555-0126", "Maritime", "Cold email", "instantly", "responded", 11, 3, "Requested meeting"],
    ["c1000001-0000-4000-8000-000000000018", "Wren", "Cole", "wren.cole@cascade-sports.com", "Cascade Sports", "cascade-sports.com", "Marketing VP", "CO", "555-0127", "Sports & Retail", "Apollo", "smartlead", "responded", 24, 5, "Meeting booked"],
    ["c1000001-0000-4000-8000-000000000019", "Riley", "Patel", "riley.patel@summit-edu.org", "Summit Education Group", "summit-edu.org", "COO", "NY", "555-0104", "EdTech", "Apollo", "unassigned", "sourced", 7, null, "Not yet assigned"],
    ["c1000001-0000-4000-8000-00000000001a", "Sam", "Okafor", "sam.okafor@greenfield-energy.com", "Greenfield Energy", "greenfield-energy.com", "Director of Procurement", "CO", "555-0108", "Energy", "LinkedIn", "smartlead", "contacted", 10, 6, "Smartlead touch 2 of 4"],
    ["c1000001-0000-4000-8000-00000000001b", "Blake", "Torres", "blake.torres@ironwood-capital.com", "Ironwood Capital", "ironwood-capital.com", "Principal", "NY", "555-0128", "Private Equity", "Apollo", "unassigned", "sourced", 5, null, null],
    ["c1000001-0000-4000-8000-00000000001c", "Cameron", "Wu", "cameron.wu@lattice-analytics.com", "Lattice Analytics", "lattice-analytics.com", "Head of Data", "CA", "555-0129", "Data & Analytics", "Conference", "unassigned", "sourced", 4, null, null],
    ["c1000001-0000-4000-8000-00000000001d", "Drew", "Hassan", "drew.hassan@oakmont-health.com", "Oakmont Health", "oakmont-health.com", "CIO", "PA", "555-0130", "Healthcare", "Referral", "unassigned", "sourced", 3, null, null],
    ["c1000001-0000-4000-8000-00000000001e", "Emery", "Voss", "emery.voss@redstone-mining.com", "Redstone Mining", "redstone-mining.com", "Site Director", "NV", "555-0131", "Mining", "Apollo", "unassigned", "sourced", 2, null, null],
    ["c1000001-0000-4000-8000-00000000001f", "Frankie", "Nakamura", "frankie.nakamura@pulse-telecom.com", "Pulse Telecom", "pulse-telecom.com", "VP Sales", "TX", "555-0132", "Telecom", "LinkedIn", "unassigned", "sourced", 1, null, null],
    ["c1000001-0000-4000-8000-000000000020", "Glen", "Fischer", "glen.fischer@harbor-credit.com", "Harbor Credit Union", "harbor-credit.com", "Branch President", "ME", "555-0133", "Financial Services", "Cold email", "unassigned", "sourced", 6, null, null],
    ["c1000001-0000-4000-8000-000000000021", "Hollis", "Bryant", "hollis.bryant@sunrise-agri.com", "Sunrise Agriculture", "sunrise-agri.com", "GM", "IA", "555-0134", "Agriculture", "Apollo", "unassigned", "sourced", 8, null, null],
    ["c1000001-0000-4000-8000-000000000022", "Ivan", "Petrov", "ivan.petrov@baltic-shipping.com", "Baltic Shipping", "baltic-shipping.com", "Fleet Manager", "MD", "555-0135", "Maritime", "LinkedIn", "instantly", "contacted", 14, 9, "Opened last email"],
    ["c1000001-0000-4000-8000-000000000023", "Jo", "Ellison", "jo.ellison@crestview-hotels.com", "Crestview Hotels", "crestview-hotels.com", "Revenue Manager", "TN", "555-0136", "Hospitality", "Apollo", "instantly", "contacted", 12, 7, null],
    ["c1000001-0000-4000-8000-000000000024", "Kit", "Mensah", "kit.mensah@urban-grid.com", "Urban Grid Utilities", "urban-grid.com", "Regulatory Affairs", "DC", "555-0137", "Utilities", "Conference", "smartlead", "contacted", 9, 4, null],
    ["c1000001-0000-4000-8000-000000000025", "Lane", "Ortiz", "lane.ortiz@prism-software.com", "Prism Software", "prism-software.com", "Product Lead", "WA", "555-0138", "B2B SaaS", "Inbound", "unassigned", "qualified", 15, 11, "Inbound demo request"],
    ["c1000001-0000-4000-8000-000000000026", "Micah", "Stern", "micah.stern@evergreen-nonprofit.org", "Evergreen Foundation", "evergreen-nonprofit.org", "Executive Director", "OR", "555-0139", "Nonprofit", "Referral", "unassigned", "sourced", 11, null, "Grant-funded org"],
  ].map(([id, first_name, last_name, email, company, company_domain, title, state, phone, vertical, source, assignment, status, sourcedDays, contactedDays, notes]) => ({
    id,
    first_name,
    last_name,
    email,
    company,
    company_domain,
    title,
    state,
    phone,
    linkedin_url: `https://linkedin.com/in/demo-${first_name.toLowerCase()}-${last_name.toLowerCase().replace("'", "")}`,
    vertical,
    source,
    assignment,
    status,
    sourced_date: ago(sourcedDays),
    last_contacted_date: contactedDays == null ? null : ago(contactedDays),
    notes,
  }));

  await insert("contacts", contacts);

  const leads = [
    { id: "b1000001-0000-4000-8000-000000000001", contact_id: "c1000001-0000-4000-8000-000000000001", status: "meeting_booked", notes: "Interested in workflow automation pilot for 3 warehouses.", followup_cadence_days: 3, next_followup_at: ahead(2), last_followup_at: ago(4), followup_count: 1, proposal_made: false, post_meeting_email_sent: true, deal_value: 48000, personal_email_account_id: "a1000001-0000-4000-8000-000000000001", status_entered_at: ago(5) },
    { id: "b1000001-0000-4000-8000-000000000002", contact_id: "c1000001-0000-4000-8000-000000000002", status: "meeting_requested", notes: "Asked for case studies in HIPAA-compliant outreach.", followup_cadence_days: 4, next_followup_at: ahead(1), followup_count: 0, deal_value: 32000, status_entered_at: ago(3) },
    { id: "b1000001-0000-4000-8000-000000000003", contact_id: "c1000001-0000-4000-8000-000000000003", status: "proposal_sent", notes: "Sent tiered pricing; decision expected end of month.", followup_cadence_days: 5, next_followup_at: ahead(4), last_followup_at: ago(6), followup_count: 2, proposal_made: true, post_meeting_email_sent: true, awaiting_response_since: ago(3), deal_value: 96000, personal_email_account_id: "a1000001-0000-4000-8000-000000000005", status_entered_at: ago(12) },
    { id: "b1000001-0000-4000-8000-000000000004", contact_id: "c1000001-0000-4000-8000-000000000004", status: "2nd_call_booked", notes: "Technical stakeholder joining next call.", followup_cadence_days: 5, next_followup_at: ahead(3), last_followup_at: ago(2), followup_count: 1, proposal_made: false, post_meeting_email_sent: true, deal_value: 55000, personal_email_account_id: "a1000001-0000-4000-8000-000000000001", status_entered_at: ago(8) },
    { id: "b1000001-0000-4000-8000-000000000005", contact_id: "c1000001-0000-4000-8000-000000000005", status: "responded", notes: "Replied positively to initial sequence.", followup_cadence_days: 3, next_followup_at: ahead(2), followup_count: 0, personal_email_account_id: "a1000001-0000-4000-8000-000000000001", status_entered_at: ago(2) },
    { id: "b1000001-0000-4000-8000-000000000006", contact_id: "c1000001-0000-4000-8000-000000000006", status: "closed", notes: "Budget freeze — revisit Q3.", last_followup_at: ago(18), followup_count: 3, deal_value: 0, closed_reason: "lost", close_lost_reason: "timing", status_entered_at: ago(25) },
    { id: "b1000001-0000-4000-8000-000000000007", contact_id: "c1000001-0000-4000-8000-000000000007", status: "meeting_taken", notes: "Strong fit for HR onboarding automation.", followup_cadence_days: 3, next_followup_at: ahead(1), proposal_made: false, post_meeting_email_sent: false, deal_value: 42000, personal_email_account_id: "a1000001-0000-4000-8000-000000000002", status_entered_at: ago(2) },
    { id: "b1000001-0000-4000-8000-000000000008", contact_id: "c1000001-0000-4000-8000-000000000008", status: "proposal_sent", notes: "Technical eval — security questionnaire in progress.", followup_cadence_days: 5, next_followup_at: ago(2), last_followup_at: ago(5), followup_count: 2, proposal_made: true, post_meeting_email_sent: true, deal_value: 78000, personal_email_account_id: "a1000001-0000-4000-8000-000000000001", status_entered_at: ago(14) },
    { id: "b1000001-0000-4000-8000-000000000009", contact_id: "c1000001-0000-4000-8000-000000000009", status: "meeting_requested", notes: "Asked for references in legal vertical.", followup_cadence_days: 4, next_followup_at: ahead(3), last_followup_at: ago(1), followup_count: 1, awaiting_response_since: ago(3), deal_value: 65000, personal_email_account_id: "a1000001-0000-4000-8000-000000000002", status_entered_at: ago(6) },
    { id: "b1000001-0000-4000-8000-00000000000a", contact_id: "c1000001-0000-4000-8000-00000000000a", status: "responded", notes: "Interested but busy — no follow-up date set yet.", followup_cadence_days: 3, deal_value: 28000, status_entered_at: ago(5) },
    { id: "b1000001-0000-4000-8000-00000000000b", contact_id: "c1000001-0000-4000-8000-00000000000b", status: "meeting_taken", notes: "Post-meeting email sent — scheduling 2nd call.", followup_cadence_days: 3, next_followup_at: ahead(5), proposal_made: false, post_meeting_email_sent: true, deal_value: 88000, personal_email_account_id: "a1000001-0000-4000-8000-000000000001", status_entered_at: ago(7) },
    { id: "b1000001-0000-4000-8000-00000000000c", contact_id: "c1000001-0000-4000-8000-00000000000c", status: "meeting_booked", notes: "Rescheduled after no-show.", next_followup_at: ahead(4), noshow_count: 1, deal_value: 36000, status_entered_at: ago(3) },
    { id: "b1000001-0000-4000-8000-00000000000d", contact_id: "c1000001-0000-4000-8000-00000000000d", status: "closed", notes: "Signed annual contract.", last_followup_at: ago(3), followup_count: 1, proposal_made: true, post_meeting_email_sent: true, deal_value: 114000, closed_reason: "won", personal_email_account_id: "a1000001-0000-4000-8000-000000000002", status_entered_at: ago(10) },
    { id: "b1000001-0000-4000-8000-00000000000e", contact_id: "c1000001-0000-4000-8000-00000000000e", status: "closed", notes: "Stopped replying after proposal.", last_followup_at: ago(25), followup_count: 4, proposal_made: true, post_meeting_email_sent: true, deal_value: 0, closed_reason: "ghosted", close_lost_reason: "ghosted", personal_email_account_id: "a1000001-0000-4000-8000-000000000005", status_entered_at: ago(35) },
    { id: "b1000001-0000-4000-8000-00000000000f", contact_id: "c1000001-0000-4000-8000-00000000000f", status: "closed", notes: "Residential brokerage — not our ICP.", deal_value: 0, closed_reason: "non_fit", close_lost_reason: "wrong_fit", status_entered_at: ago(18) },
    { id: "b1000001-0000-4000-8000-000000000010", contact_id: "c1000001-0000-4000-8000-000000000010", status: "closed", notes: "Chose Outreach.io on price.", last_followup_at: ago(8), followup_count: 2, proposal_made: true, post_meeting_email_sent: true, deal_value: 0, closed_reason: "lost", close_lost_reason: "went_with_competitor", personal_email_account_id: "a1000001-0000-4000-8000-000000000001", status_entered_at: ago(20) },
    { id: "b1000001-0000-4000-8000-000000000011", contact_id: "c1000001-0000-4000-8000-000000000011", status: "closed", notes: "Likes product but budget locked until Q4.", last_followup_at: ago(12), followup_count: 2, post_meeting_email_sent: true, deal_value: 0, closed_reason: "lost", close_lost_reason: "no_budget", status_entered_at: ago(22) },
    { id: "b1000001-0000-4000-8000-000000000012", contact_id: "c1000001-0000-4000-8000-000000000012", status: "closed", notes: "Enterprise win — 3-year deal.", last_followup_at: ago(2), proposal_made: true, post_meeting_email_sent: true, deal_value: 185000, closed_reason: "won", personal_email_account_id: "a1000001-0000-4000-8000-000000000002", status_entered_at: ago(5) },
    { id: "b1000001-0000-4000-8000-000000000013", contact_id: "c1000001-0000-4000-8000-000000000013", status: "2nd_call_booked", notes: "Creative agency — wants white-label option.", followup_cadence_days: 5, next_followup_at: ahead(6), proposal_made: false, post_meeting_email_sent: true, deal_value: 44000, personal_email_account_id: "a1000001-0000-4000-8000-000000000008", status_entered_at: ago(4) },
    { id: "b1000001-0000-4000-8000-000000000014", contact_id: "c1000001-0000-4000-8000-000000000014", status: "2nd_call_booked", notes: "Energy procurement — multi-site rollout.", followup_cadence_days: 5, next_followup_at: ahead(2), last_followup_at: ago(3), followup_count: 1, proposal_made: false, post_meeting_email_sent: true, deal_value: 72000, personal_email_account_id: "a1000001-0000-4000-8000-000000000005", status_entered_at: ago(9) },
    { id: "b1000001-0000-4000-8000-000000000015", contact_id: "c1000001-0000-4000-8000-000000000015", status: "proposal_sent", notes: "School district pilot — 3 campuses.", followup_cadence_days: 5, next_followup_at: ahead(1), last_followup_at: ago(7), followup_count: 1, proposal_made: true, post_meeting_email_sent: true, deal_value: 52000, personal_email_account_id: "a1000001-0000-4000-8000-00000000000a", status_entered_at: ago(11) },
    { id: "b1000001-0000-4000-8000-000000000016", contact_id: "c1000001-0000-4000-8000-000000000016", status: "responded", notes: "Partnership motion — early exploration.", followup_cadence_days: 3, next_followup_at: ahead(3), personal_email_account_id: "a1000001-0000-4000-8000-000000000008", status_entered_at: ago(1) },
    { id: "b1000001-0000-4000-8000-000000000017", contact_id: "c1000001-0000-4000-8000-000000000017", status: "meeting_requested", notes: "Maritime ops — asked for deck before booking.", followup_cadence_days: 4, next_followup_at: ahead(2), deal_value: 38000, status_entered_at: ago(4) },
    { id: "b1000001-0000-4000-8000-000000000018", contact_id: "c1000001-0000-4000-8000-000000000018", status: "meeting_booked", notes: "Sports retail — seasonal campaign timing.", next_followup_at: ahead(5), deal_value: 29000, personal_email_account_id: "a1000001-0000-4000-8000-000000000001", status_entered_at: ago(2) },
  ];

  await insert(
    "leads",
    leads.map((lead) =>
      applyLeadTiming(
        {
          followup_count: 0,
          noshow_count: 0,
          proposal_made: false,
          post_meeting_email_sent: false,
          ...lead,
        },
        base
      )
    )
  );

  await insert("lead_activity", [
    { lead_id: "b1000001-0000-4000-8000-000000000001", activity_type: "created", description: "Added to pipeline", created_at: ago(14) },
    { lead_id: "b1000001-0000-4000-8000-000000000001", activity_type: "status", description: "Moved to Meeting Booked", created_at: ago(5) },
    { lead_id: "b1000001-0000-4000-8000-000000000003", activity_type: "followup", description: "Followed up", created_at: ago(6) },
    { lead_id: "b1000001-0000-4000-8000-000000000007", activity_type: "status", description: "Meeting taken", created_at: ago(2) },
    { lead_id: "b1000001-0000-4000-8000-00000000000c", activity_type: "noshow", description: "No-show logged", created_at: ago(6) },
    { lead_id: "b1000001-0000-4000-8000-00000000000d", activity_type: "status", description: "Closed won", created_at: ago(10) },
    { lead_id: "b1000001-0000-4000-8000-000000000012", activity_type: "status", description: "Closed won", created_at: ago(5) },
  ]);

  await insert("lead_meeting_booked_events", buildMeetingBookedRows(base));

  await insert("templates", [
    { id: "e1000001-0000-4000-8000-000000000001", name: "Intro — ops leaders", subject_line: "Quick idea for {{company}}", body: "Hi {{first_name}},\n\nI noticed {{company}} is scaling regional operations. We help teams like yours cut manual follow-up work by ~30%.\n\nOpen to a 15-minute call next week?\n\n— Alex", last_used_date: ago(2) },
    { id: "e1000001-0000-4000-8000-000000000002", name: "Follow-up — no reply", subject_line: "Re: {{company}} outreach workflow", body: "Hi {{first_name}},\n\nCircling back in case this got buried. Happy to share a one-page overview tailored to {{vertical}}.\n\nBest,\nAlex", last_used_date: ago(5) },
    { id: "e1000001-0000-4000-8000-000000000003", name: "Intro — healthcare compliance", subject_line: "HIPAA-safe outreach for {{company}}", body: "Hi {{first_name}},\n\n{{company}}'s growth in {{vertical}} caught my eye. We work with several HIPAA-covered entities on compliant outbound.\n\nWorth a brief chat?\n\n— Alex", last_used_date: ago(8) },
    { id: "e1000001-0000-4000-8000-000000000004", name: "Intro — fintech RevOps", subject_line: "RevOps automation at {{company}}", body: "Hi {{first_name}},\n\nRevOps teams at {{vertical}} companies use us to unify follow-ups across Salesforce and their sequencer.\n\n15 minutes to compare notes?\n\n— Alex", last_used_date: ago(1) },
    { id: "e1000001-0000-4000-8000-000000000005", name: "Breakup — final touch", subject_line: "Closing the loop — {{company}}", body: "Hi {{first_name}},\n\nI'll assume timing isn't right for {{company}}. If priorities shift, I'm here.\n\nAll the best,\nAlex", last_used_date: ago(30) },
    { id: "e1000001-0000-4000-8000-000000000006", name: "Post-meeting recap", subject_line: "Great speaking with you — {{company}} next steps", body: "Hi {{first_name}},\n\nThanks for the time today. As discussed, here's a short recap and proposed pilot scope for {{company}}.\n\nLet me know if Thursday works for a follow-up.\n\n— Alex", last_used_date: ago(3) },
    { id: "e1000001-0000-4000-8000-000000000007", name: "Intro — manufacturing", subject_line: "Reducing downtime comms at {{company}}", body: "Hi {{first_name}},\n\nPlant teams at manufacturers like {{company}} use us to standardize escalation when lines go down.\n\nOpen to a quick intro call?\n\n— Alex" },
    { id: "e1000001-0000-4000-8000-000000000008", name: "Referral ask", subject_line: "Know anyone at similar {{vertical}} companies?", body: "Hi {{first_name}},\n\nEven if {{company}} isn't a fit right now, I'd appreciate an intro to anyone in {{vertical}} wrestling with outbound ops.\n\nThank you,\nAlex" },
    { id: "e1000001-0000-4000-8000-000000000009", name: "Meeting request — soft CTA", subject_line: "15 min next week?", body: "Hi {{first_name}},\n\nBased on what I've seen at {{company}}, I think we could shave hours off your weekly follow-up admin.\n\nDo you have 15 minutes next Tuesday or Wednesday?\n\n— Alex", last_used_date: ago(12) },
    { id: "e1000001-0000-4000-8000-00000000000a", name: "Case study offer", subject_line: "{{vertical}} case study for {{company}}", body: "Hi {{first_name}},\n\nWe just published results from a {{vertical}} customer with a similar team size to {{company}}.\n\nWant me to send the PDF?\n\n— Alex", last_used_date: ago(6) },
  ]);

  await insert("todos", [
    { text: "Prep demo deck for Northwind call", done: false, priority: true, position: 0 },
    { text: "Update Harborline proposal pricing table", done: false, priority: true, position: 1 },
    { text: "Send post-meeting email to Dana Walsh (Pioneer HR)", done: false, priority: true, position: 2 },
    { text: "Follow up with Eli Martinez — overdue", done: false, priority: true, position: 3 },
    { text: "Make proposal for Taylor Kim (Atlas Manufacturing)", done: false, priority: true, position: 4 },
    { text: "Nudge Finn O'Brien — awaiting reply 3+ days", done: false, priority: true, position: 5 },
    { text: "Set follow-up date for Gray Sato (NexGen Biotech)", done: false, priority: false, position: 6 },
    { text: "Review Instantly warmup scores", done: false, priority: false, position: 7 },
    { text: "Assign Prism Software inbound to personal sequence", done: false, priority: false, position: 8 },
    { text: "Pause legacy@lumen-demo.com in Smartlead", done: false, priority: false, position: 9 },
    { text: "Export Q2 meeting-booked report for team standup", done: false, priority: false, position: 10 },
    { text: "Draft case study blurb for Stellar Pharma win", done: false, priority: false, position: 11 },
    { text: "Reschedule Indigo Rossi after no-show", done: false, priority: false, position: 12 },
    { text: "Archive disqualified Lumen Retail contact", done: true, priority: false, position: 13 },
    { text: "Upload Quantum Insurance signed contract", done: true, priority: false, position: 14 },
    { text: "Rotate passwords on warming inboxes", done: true, priority: false, position: 15 },
    { text: "Clean up Apollo export duplicates", done: true, priority: false, position: 16 },
    { text: "Send breakup sequence to Crestview Hotels", done: true, priority: false, position: 17 },
  ]);

  await insert("daily_sending_volume", buildDailyVolumeRows(base));

  await insert("outreach_log", [
    { contact_id: "c1000001-0000-4000-8000-000000000019", template_id: "e1000001-0000-4000-8000-000000000001", email_account_id: "a1000001-0000-4000-8000-000000000004", subject_sent: "Quick idea for Summit Education Group", body_sent: "Hi Riley,\n\nI noticed Summit Education Group is scaling...", sent_date: ago(6) },
    { contact_id: "c1000001-0000-4000-8000-000000000005", template_id: "e1000001-0000-4000-8000-000000000001", email_account_id: "a1000001-0000-4000-8000-000000000001", subject_sent: "Quick idea for Vertex Security", body_sent: "Hi Quinn,\n\nI noticed Vertex Security is scaling...", sent_date: ago(14) },
    { contact_id: "c1000001-0000-4000-8000-000000000001", template_id: "e1000001-0000-4000-8000-000000000009", email_account_id: "a1000001-0000-4000-8000-000000000001", subject_sent: "15 min next week?", body_sent: "Hi Morgan,\n\nBased on what I've seen at Northwind Logistics...", sent_date: ago(18) },
  ]);

  console.log("\nDone! Refresh http://localhost:3000");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});

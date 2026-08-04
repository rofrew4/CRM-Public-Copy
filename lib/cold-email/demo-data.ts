import type {
  Campaign,
  ContactList,
  InboxMessage,
  ListContact,
  SendingAccount,
  WarmupActivity,
} from "./types";

const hoursAgo = (h: number) =>
  new Date(Date.now() - h * 3_600_000).toISOString();
const daysAgo = (d: number) =>
  new Date(Date.now() - d * 86_400_000).toISOString();

export const DEMO_ACCOUNTS: SendingAccount[] = [
  {
    id: "acc-1",
    email: "alex.morgan@northwind-outreach.io",
    displayName: "Alex Morgan",
    dailyCap: 12,
    sentToday: 7,
    active: true,
    warmup: false,
    connected: true,
  },
  {
    id: "acc-2",
    email: "jordan.lee@northwind-outreach.io",
    displayName: "Jordan Lee",
    dailyCap: 10,
    sentToday: 4,
    active: true,
    warmup: true,
    connected: true,
  },
  {
    id: "acc-3",
    email: "sam.chen@brightpath-demo.com",
    displayName: "Sam Chen",
    dailyCap: 8,
    sentToday: 2,
    active: true,
    warmup: true,
    connected: true,
  },
  {
    id: "acc-4",
    email: "casey.nguyen@harborline-demo.com",
    displayName: "Casey Nguyen",
    dailyCap: 10,
    sentToday: 9,
    active: true,
    warmup: false,
    connected: true,
  },
  {
    id: "acc-5",
    email: "riley.park@vertex-demo.io",
    displayName: "Riley Park",
    dailyCap: 6,
    sentToday: 0,
    active: false,
    warmup: true,
    connected: true,
  },
  {
    id: "acc-6",
    email: "taylor.kim@atlas-demo-mail.com",
    displayName: "Taylor Kim",
    dailyCap: 8,
    sentToday: 3,
    active: true,
    warmup: true,
    connected: true,
  },
];

export const DEMO_CONTACTS: ListContact[] = [
  { id: "ct-01", email: "m.reed@northwind-logistics.com", firstName: "Morgan", lastName: "Reed", company: "Northwind Logistics", title: "VP Operations" },
  { id: "ct-02", email: "j.blake@brightpath-health.com", firstName: "Jordan", lastName: "Blake", company: "Brightpath Health", title: "Director of Growth" },
  { id: "ct-03", email: "c.nguyen@harborline-finance.com", firstName: "Casey", lastName: "Nguyen", company: "Harborline Finance", title: "Head of RevOps" },
  { id: "ct-04", email: "t.kim@atlas-manufacturing.com", firstName: "Taylor", lastName: "Kim", company: "Atlas Manufacturing", title: "Plant Manager" },
  { id: "ct-05", email: "q.foster@vertex-security.com", firstName: "Quinn", lastName: "Foster", company: "Vertex Security", title: "CEO" },
  { id: "ct-06", email: "d.walsh@pioneer-hr.com", firstName: "Dana", lastName: "Walsh", company: "Pioneer HR", title: "VP People" },
  { id: "ct-07", email: "e.martinez@cloudbridge.io", firstName: "Eli", lastName: "Martinez", company: "Cloudbridge", title: "CTO" },
  { id: "ct-08", email: "f.obrien@sterling-legal.com", firstName: "Finn", lastName: "O'Brien", company: "Sterling Legal Partners", title: "Managing Partner" },
  { id: "ct-09", email: "g.sato@nexgen-biotech.com", firstName: "Gray", lastName: "Sato", company: "NexGen Biotech", title: "Director of Ops" },
  { id: "ct-10", email: "h.jones@ridgeline-construction.com", firstName: "Harper", lastName: "Jones", company: "Ridgeline Construction", title: "COO" },
  { id: "ct-11", email: "i.rossi@meridian-media.com", firstName: "Indigo", lastName: "Rossi", company: "Meridian Media", title: "Head of Sales" },
  { id: "ct-12", email: "j.park@quantum-insurance.com", firstName: "Jules", lastName: "Park", company: "Quantum Insurance", title: "Chief Actuary" },
  { id: "ct-13", email: "k.andersson@nordic-foods.com", firstName: "Kai", lastName: "Andersson", company: "Nordic Foods Co", title: "Supply Chain Director" },
  { id: "ct-14", email: "l.brooks@apex-realestate.com", firstName: "Logan", lastName: "Brooks", company: "Apex Real Estate", title: "Broker Owner" },
  { id: "ct-15", email: "m.hayes@silverline-saas.com", firstName: "Morgan", lastName: "Hayes", company: "Silverline SaaS", title: "CRO" },
  { id: "ct-16", email: "n.singh@horizon-logistics.com", firstName: "Noah", lastName: "Singh", company: "Horizon Logistics", title: "Director of Fleet" },
  { id: "ct-17", email: "p.liu@stellar-pharma.com", firstName: "Parker", lastName: "Liu", company: "Stellar Pharma", title: "VP Commercial" },
  { id: "ct-18", email: "r.dubois@atelier-design.com", firstName: "Reese", lastName: "Dubois", company: "Atelier Design Studio", title: "Creative Director" },
  { id: "ct-19", email: "s.okonkwo@terra-energy.com", firstName: "Sage", lastName: "Okonkwo", company: "Terra Energy", title: "Procurement Lead" },
  { id: "ct-20", email: "t.reed@blueoak-edu.com", firstName: "Tatum", lastName: "Reed", company: "Blue Oak Education", title: "Superintendent" },
  { id: "ct-21", email: "u.patel@velocity-fintech.com", firstName: "Uma", lastName: "Patel", company: "Velocity Fintech", title: "Head of Partnerships" },
  { id: "ct-22", email: "v.kimura@pacific-shipping.com", firstName: "Vale", lastName: "Kimura", company: "Pacific Shipping Group", title: "Operations Manager" },
  { id: "ct-23", email: "w.cole@cascade-sports.com", firstName: "Wren", lastName: "Cole", company: "Cascade Sports", title: "Marketing VP" },
  { id: "ct-24", email: "b.torres@ironwood-capital.com", firstName: "Blake", lastName: "Torres", company: "Ironwood Capital", title: "Principal" },
  { id: "ct-25", email: "c.wu@lattice-analytics.com", firstName: "Cameron", lastName: "Wu", company: "Lattice Analytics", title: "Head of Data" },
  { id: "ct-26", email: "d.hassan@oakmont-health.com", firstName: "Drew", lastName: "Hassan", company: "Oakmont Health", title: "CIO" },
  { id: "ct-27", email: "e.voss@redstone-mining.com", firstName: "Emery", lastName: "Voss", company: "Redstone Mining", title: "Site Director" },
  { id: "ct-28", email: "f.nakamura@pulse-telecom.com", firstName: "Frankie", lastName: "Nakamura", company: "Pulse Telecom", title: "VP Sales" },
  { id: "ct-29", email: "g.fischer@harbor-credit.com", firstName: "Glen", lastName: "Fischer", company: "Harbor Credit Union", title: "Branch President" },
  { id: "ct-30", email: "h.bryant@sunrise-agri.com", firstName: "Hollis", lastName: "Bryant", company: "Sunrise Agriculture", title: "GM" },
  { id: "ct-31", email: "ceo@chesterbrook-partners.com", firstName: "Avery", lastName: "Whitfield", company: "Chesterbrook Partners", title: "CEO" },
  { id: "ct-32", email: "ops@chesterbrook-partners.com", firstName: "Miles", lastName: "Grant", company: "Chesterbrook Partners", title: "COO" },
  { id: "ct-33", email: "growth@chesterbrook-partners.com", firstName: "Sloane", lastName: "Park", company: "Chesterbrook Partners", title: "VP Growth" },
  { id: "ct-34", email: "revops@chesterbrook-partners.com", firstName: "Devon", lastName: "Hale", company: "Chesterbrook Partners", title: "RevOps Lead" },
];

export const DEMO_LISTS: ContactList[] = [
  {
    id: "list-1",
    name: "CEO of Chesterbrook",
    description: "C-suite & growth leaders at Chesterbrook Partners and peer PE firms",
    contactIds: [
      "ct-31", "ct-32", "ct-33", "ct-34", "ct-24", "ct-15", "ct-05", "ct-03",
      "ct-21", "ct-12", "ct-07", "ct-17",
    ],
    createdAt: daysAgo(21),
  },
  {
    id: "list-2",
    name: "Ops leaders — Mid-Atlantic",
    description: "VP Ops / COO targets in logistics, manufacturing, energy",
    contactIds: [
      "ct-01", "ct-04", "ct-09", "ct-10", "ct-13", "ct-16", "ct-19", "ct-22",
      "ct-27", "ct-30",
    ],
    createdAt: daysAgo(14),
  },
  {
    id: "list-3",
    name: "SaaS CROs & Growth",
    description: "B2B SaaS commercial leaders for Q3 outbound",
    contactIds: [
      "ct-02", "ct-06", "ct-11", "ct-15", "ct-18", "ct-23", "ct-25", "ct-28",
    ],
    createdAt: daysAgo(8),
  },
  {
    id: "list-4",
    name: "Healthcare & Fintech pilots",
    description: "Warm intros and inbound demo requests",
    contactIds: ["ct-02", "ct-03", "ct-12", "ct-21", "ct-26", "ct-29"],
    createdAt: daysAgo(4),
  },
];

export const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: "camp-1",
    name: "CEO of Chesterbrook",
    status: "active",
    listId: "list-1",
    sendWindowStart: "08:43",
    sendWindowEnd: "16:00",
    enrolled: 64,
    sent: 187,
    replied: 9,
    opened: 112,
    steps: [
      {
        id: "s1-1",
        order: 1,
        delayDays: 0,
        subject: "Quick idea for {company}",
        body: `Hi {first_name},

I noticed {company} is scaling outbound across a few verticals. We help teams like yours cut manual follow-up work by ~30% without adding headcount.

Open to a 15-minute call next week?

— Alex`,
      },
      {
        id: "s1-2",
        order: 2,
        delayDays: 3,
        subject: "Re: {company} outreach workflow",
        body: `Hi {first_name},

Circling back in case this got buried. Happy to share a one-page overview tailored to your team.

Best,
Alex`,
      },
      {
        id: "s1-3",
        order: 3,
        delayDays: 5,
        subject: "Closing the loop — {company}",
        body: `Hi {first_name},

I'll assume timing isn't right. If priorities shift, I'm here.

— Alex`,
      },
    ],
    enrollments: [
      { id: "en-1", contactId: "ct-31", status: "replied", stepIndex: 1, lastTouchedAt: hoursAgo(6) },
      { id: "en-2", contactId: "ct-33", status: "replied", stepIndex: 0, lastTouchedAt: hoursAgo(18) },
      { id: "en-3", contactId: "ct-24", status: "active", stepIndex: 1, lastTouchedAt: hoursAgo(30) },
      { id: "en-4", contactId: "ct-15", status: "active", stepIndex: 0, lastTouchedAt: hoursAgo(12) },
      { id: "en-5", contactId: "ct-05", status: "completed", stepIndex: 2, lastTouchedAt: daysAgo(3) },
      { id: "en-6", contactId: "ct-03", status: "active", stepIndex: 1, lastTouchedAt: hoursAgo(40) },
      { id: "en-7", contactId: "ct-21", status: "paused", stepIndex: 0, lastTouchedAt: daysAgo(2) },
      { id: "en-8", contactId: "ct-12", status: "replied", stepIndex: 1, lastTouchedAt: hoursAgo(9) },
    ],
  },
  {
    id: "camp-2",
    name: "Ops Mid-Atlantic — Sequence A",
    status: "paused",
    listId: "list-2",
    sendWindowStart: "09:00",
    sendWindowEnd: "15:30",
    enrolled: 42,
    sent: 98,
    replied: 4,
    opened: 61,
    steps: [
      {
        id: "s2-1",
        order: 1,
        delayDays: 0,
        subject: "Reducing downtime comms at {company}",
        body: `Hi {first_name},

Plant and ops teams at manufacturers like {company} use us to standardize escalation when lines go down.

Open to a quick intro call?

— Jordan`,
      },
      {
        id: "s2-2",
        order: 2,
        delayDays: 4,
        subject: "{first_name} — 15 min next week?",
        body: `Hi {first_name},

Based on what I've seen at {company}, I think we could shave hours off weekly follow-up admin.

Do you have 15 minutes Tuesday or Wednesday?

— Jordan`,
      },
    ],
    enrollments: [
      { id: "en-9", contactId: "ct-01", status: "replied", stepIndex: 0, lastTouchedAt: daysAgo(1) },
      { id: "en-10", contactId: "ct-04", status: "active", stepIndex: 1, lastTouchedAt: daysAgo(2) },
      { id: "en-11", contactId: "ct-10", status: "paused", stepIndex: 0, lastTouchedAt: daysAgo(4) },
      { id: "en-12", contactId: "ct-16", status: "completed", stepIndex: 1, lastTouchedAt: daysAgo(5) },
    ],
  },
  {
    id: "camp-3",
    name: "SaaS CRO intro — Draft",
    status: "draft",
    listId: "list-3",
    sendWindowStart: "08:30",
    sendWindowEnd: "17:00",
    enrolled: 0,
    sent: 0,
    replied: 0,
    opened: 0,
    steps: [
      {
        id: "s3-1",
        order: 1,
        delayDays: 0,
        subject: "RevOps automation at {company}",
        body: `Hi {first_name},

RevOps teams at SaaS companies use us to unify follow-ups across Salesforce and their sequencer.

15 minutes to compare notes?

— Sam`,
      },
    ],
    enrollments: [],
  },
  {
    id: "camp-4",
    name: "Healthcare pilots — Q2 wrap",
    status: "completed",
    listId: "list-4",
    sendWindowStart: "10:00",
    sendWindowEnd: "14:00",
    enrolled: 28,
    sent: 76,
    replied: 6,
    opened: 48,
    steps: [
      {
        id: "s4-1",
        order: 1,
        delayDays: 0,
        subject: "HIPAA-safe outreach for {company}",
        body: `Hi {first_name},

{company}'s growth caught my eye. We work with several HIPAA-covered entities on compliant outbound.

Worth a brief chat?

— Casey`,
      },
    ],
    enrollments: [
      { id: "en-13", contactId: "ct-02", status: "replied", stepIndex: 0, lastTouchedAt: daysAgo(12) },
      { id: "en-14", contactId: "ct-26", status: "completed", stepIndex: 0, lastTouchedAt: daysAgo(10) },
    ],
  },
];

export const DEMO_INBOX: InboxMessage[] = [
  {
    id: "msg-1",
    fromEmail: "ceo@chesterbrook-partners.com",
    fromName: "Avery Whitfield",
    subject: "Re: Quick idea for Chesterbrook Partners",
    snippet: "Alex — this is timely. We're evaluating outbound tooling for the growth team. Can you send a one-pager?",
    body: `Alex — this is timely. We're evaluating outbound tooling for the growth team next quarter.

Can you send a one-pager and a couple of PE-relevant references? Happy to find 20 minutes Thursday or Friday.

Best,
Avery Whitfield
CEO, Chesterbrook Partners`,
    receivedAt: hoursAgo(5),
    unread: true,
    campaignId: "camp-1",
    contactId: "ct-31",
    company: "Chesterbrook Partners",
    sentiment: "interested",
  },
  {
    id: "msg-2",
    fromEmail: "growth@chesterbrook-partners.com",
    fromName: "Sloane Park",
    subject: "Re: Quick idea for Chesterbrook Partners",
    snippet: "Would love to book a call — are you free Tuesday afternoon?",
    body: `Would love to book a call — are you free Tuesday afternoon ET?

We just kicked off a RevOps hire and want to clean up sequences before they start.

— Sloane`,
    receivedAt: hoursAgo(14),
    unread: true,
    campaignId: "camp-1",
    contactId: "ct-33",
    company: "Chesterbrook Partners",
    sentiment: "meeting",
  },
  {
    id: "msg-3",
    fromEmail: "j.park@quantum-insurance.com",
    fromName: "Jules Park",
    subject: "Re: Quick idea for Quantum Insurance",
    snippet: "Not a fit right now — we locked a vendor last month. Feel free to check back in Q4.",
    body: `Not a fit right now — we locked a vendor last month. Feel free to check back in Q4.

Jules`,
    receivedAt: hoursAgo(8),
    unread: true,
    campaignId: "camp-1",
    contactId: "ct-12",
    company: "Quantum Insurance",
    sentiment: "not_interested",
  },
  {
    id: "msg-4",
    fromEmail: "m.reed@northwind-logistics.com",
    fromName: "Morgan Reed",
    subject: "Re: Reducing downtime comms at Northwind Logistics",
    snippet: "Interesting — we have three warehouses struggling with escalation handoffs. Let's talk.",
    body: `Interesting — we have three warehouses struggling with escalation handoffs. Let's talk next week if you have a slot.

Morgan Reed
VP Operations`,
    receivedAt: hoursAgo(26),
    unread: false,
    campaignId: "camp-2",
    contactId: "ct-01",
    company: "Northwind Logistics",
    sentiment: "interested",
  },
  {
    id: "msg-5",
    fromEmail: "j.blake@brightpath-health.com",
    fromName: "Jordan Blake",
    subject: "Out of Office: Re: HIPAA-safe outreach for Brightpath Health",
    snippet: "I am out of the office until Monday with limited access to email.",
    body: `I am out of the office until Monday with limited access to email.

For urgent matters contact operations@brightpath-health.com.

Thank you,
Jordan Blake`,
    receivedAt: daysAgo(2),
    unread: false,
    campaignId: "camp-4",
    contactId: "ct-02",
    company: "Brightpath Health",
    sentiment: "ooo",
  },
  {
    id: "msg-6",
    fromEmail: "e.martinez@cloudbridge.io",
    fromName: "Eli Martinez",
    subject: "Re: Quick idea for Cloudbridge",
    snippet: "Can you share your SOC2 / security questionnaire before we book?",
    body: `Can you share your SOC2 / security questionnaire before we book?

If that looks good we can do a technical walkthrough with our platform team.

— Eli`,
    receivedAt: hoursAgo(3),
    unread: true,
    campaignId: "camp-1",
    contactId: "ct-07",
    company: "Cloudbridge",
    sentiment: "interested",
  },
  {
    id: "msg-7",
    fromEmail: "l.brooks@apex-realestate.com",
    fromName: "Logan Brooks",
    subject: "Re: Quick idea for Apex Real Estate",
    snippet: "We're residential-only — wrong ICP for what you're describing.",
    body: `We're residential-only — wrong ICP for what you're describing. Thanks for reaching out though.

Logan`,
    receivedAt: daysAgo(1),
    unread: false,
    campaignId: "camp-1",
    contactId: "ct-14",
    company: "Apex Real Estate",
    sentiment: "not_interested",
  },
  {
    id: "msg-8",
    fromEmail: "u.patel@velocity-fintech.com",
    fromName: "Uma Patel",
    subject: "Re: Quick idea for Velocity Fintech",
    snippet: "Partnership angle is interesting — can we do a 15-min intro Friday?",
    body: `Partnership angle is interesting — can we do a 15-min intro Friday morning?

I'll bring our partnerships lead.

Uma Patel`,
    receivedAt: hoursAgo(1),
    unread: true,
    campaignId: "camp-1",
    contactId: "ct-21",
    company: "Velocity Fintech",
    sentiment: "meeting",
  },
  {
    id: "msg-9",
    fromEmail: "h.jones@ridgeline-construction.com",
    fromName: "Harper Jones",
    subject: "Re: Reducing downtime comms at Ridgeline Construction",
    snippet: "Paused for budget reasons — ping me after Labor Day.",
    body: `Paused for budget reasons — ping me after Labor Day and we can revisit.

Harper`,
    receivedAt: daysAgo(3),
    unread: false,
    campaignId: "camp-2",
    contactId: "ct-10",
    company: "Ridgeline Construction",
    sentiment: "neutral",
  },
  {
    id: "msg-10",
    fromEmail: "d.hassan@oakmont-health.com",
    fromName: "Drew Hassan",
    subject: "Re: HIPAA-safe outreach for Oakmont Health",
    snippet: "Please add compliance@oakmont-health.com to any follow-ups.",
    body: `Please add compliance@oakmont-health.com to any follow-ups. Happy to review materials asynchronously first.

Drew Hassan
CIO`,
    receivedAt: hoursAgo(36),
    unread: true,
    campaignId: "camp-4",
    contactId: "ct-26",
    company: "Oakmont Health",
    sentiment: "interested",
  },
  {
    id: "msg-11",
    fromEmail: "w.cole@cascade-sports.com",
    fromName: "Wren Cole",
    subject: "Automatic reply: Out of Office",
    snippet: "Thanks for your email. I'm traveling through Friday with delayed responses.",
    body: `Thanks for your email. I'm traveling through Friday with delayed responses.

Wren Cole
Marketing VP, Cascade Sports`,
    receivedAt: hoursAgo(20),
    unread: false,
    campaignId: "camp-3",
    contactId: "ct-23",
    company: "Cascade Sports",
    sentiment: "ooo",
  },
  {
    id: "msg-12",
    fromEmail: "c.wu@lattice-analytics.com",
    fromName: "Cameron Wu",
    subject: "Re: RevOps automation at Lattice Analytics",
    snippet: "Send the case study PDF — if it looks relevant I'll loop in our CRO.",
    body: `Send the case study PDF — if it looks relevant I'll loop in our CRO.

Cameron`,
    receivedAt: hoursAgo(10),
    unread: true,
    campaignId: "camp-3",
    contactId: "ct-25",
    company: "Lattice Analytics",
    sentiment: "interested",
  },
];

export const DEMO_WARMUP: WarmupActivity[] = [
  {
    id: "wu-1",
    type: "outbound",
    fromEmail: "jordan.lee@northwind-outreach.io",
    toEmail: "sam.chen@brightpath-demo.com",
    subject: "Quick check-in on the Q3 plan",
    at: hoursAgo(2),
  },
  {
    id: "wu-2",
    type: "reply",
    fromEmail: "sam.chen@brightpath-demo.com",
    toEmail: "jordan.lee@northwind-outreach.io",
    subject: "Re: Quick check-in on the Q3 plan",
    at: hoursAgo(1.5),
  },
  {
    id: "wu-3",
    type: "outbound",
    fromEmail: "riley.park@vertex-demo.io",
    toEmail: "taylor.kim@atlas-demo-mail.com",
    subject: "Thoughts on the vendor shortlist?",
    at: hoursAgo(4),
  },
  {
    id: "wu-4",
    type: "outbound",
    fromEmail: "taylor.kim@atlas-demo-mail.com",
    toEmail: "jordan.lee@northwind-outreach.io",
    subject: "Coffee next week?",
    at: hoursAgo(5),
  },
  {
    id: "wu-5",
    type: "reply",
    fromEmail: "jordan.lee@northwind-outreach.io",
    toEmail: "taylor.kim@atlas-demo-mail.com",
    subject: "Re: Coffee next week?",
    at: hoursAgo(3),
  },
  {
    id: "wu-6",
    type: "outbound",
    fromEmail: "sam.chen@brightpath-demo.com",
    toEmail: "riley.park@vertex-demo.io",
    subject: "Shared notes from yesterday",
    at: hoursAgo(7),
  },
];

export function cloneDemoState() {
  return {
    accounts: structuredClone(DEMO_ACCOUNTS),
    contacts: structuredClone(DEMO_CONTACTS),
    lists: structuredClone(DEMO_LISTS),
    campaigns: structuredClone(DEMO_CAMPAIGNS),
    inbox: structuredClone(DEMO_INBOX),
    warmup: structuredClone(DEMO_WARMUP),
  };
}

export function contactById(id: string) {
  return DEMO_CONTACTS.find((c) => c.id === id);
}

export function listById(id: string) {
  return DEMO_LISTS.find((l) => l.id === id);
}

export function campaignById(id: string) {
  return DEMO_CAMPAIGNS.find((c) => c.id === id);
}

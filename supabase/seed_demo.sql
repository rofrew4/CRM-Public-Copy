-- Fictional demo data — run AFTER fresh_project_schema.sql on a new Supabase project.
--
-- IMPORTANT: Open this FILE in the Supabase SQL Editor (Run), don't copy from chat.
-- If paste fails partway through, use: npm run seed
-- Before demos (keeps kanban highlight mix fresh): npm run seed:refresh-dates
--
-- Wrapped in a transaction so a failed insert won't leave an empty database.

BEGIN;

TRUNCATE outreach_log, lead_activity, lead_meeting_booked_events, leads, contacts,
  templates, todos, daily_sending_volume, email_accounts
  RESTART IDENTITY CASCADE;

-- ============ EMAIL ACCOUNTS (10) ============
INSERT INTO email_accounts (
  id, email_address, domain, provider, purchase_date, monthly_cost, daily_volume,
  inbox_use, status, last_mailreach_score, last_mailreach_test_date, last_mailreach_notes
) VALUES
  (
    'a1000001-0000-4000-8000-000000000001',
    'alex.demo@northwind-outreach.io', 'northwind-outreach.io',
    'Google Workspace', '2025-01-15', 12.00, 25,
    'personal', 'active', 92, now() - interval '3 days',
    'Inbox healthy — demo data only'
  ),
  (
    'a1000001-0000-4000-8000-000000000002',
    'jordan.sales@northwind-outreach.io', 'northwind-outreach.io',
    'Google Workspace', '2025-02-20', 12.00, 20,
    'personal', 'active', 89, now() - interval '5 days',
    'Secondary personal inbox — strong deliverability'
  ),
  (
    'a1000001-0000-4000-8000-000000000003',
    'campaigns@brightpath-demo.com', 'brightpath-demo.com',
    'Microsoft 365', '2025-02-01', 10.00, 40,
    'instantly', 'warming', 78, now() - interval '1 day',
    'Still warming — fictional account'
  ),
  (
    'a1000001-0000-4000-8000-000000000004',
    'sequences@brightpath-demo.com', 'brightpath-demo.com',
    'Microsoft 365', '2025-03-05', 10.00, 35,
    'instantly', 'active', 85, now() - interval '2 days',
    'Primary Instantly rotation inbox'
  ),
  (
    'a1000001-0000-4000-8000-000000000005',
    'outbound@harborline-demo.com', 'harborline-demo.com',
    'Google Workspace', '2025-03-10', 12.00, 30,
    'smartlead', 'active', 88, now() - interval '4 days',
    'Demo Smartlead inbox — fintech vertical'
  ),
  (
    'a1000001-0000-4000-8000-000000000006',
    'growth@harborline-demo.com', 'harborline-demo.com',
    'Google Workspace', '2025-04-01', 12.00, 28,
    'smartlead', 'warming', 72, now() - interval '6 days',
    'New domain — week 3 of warmup'
  ),
  (
    'a1000001-0000-4000-8000-000000000007',
    'ops@atlas-demo-mail.com', 'atlas-demo-mail.com',
    'Google Workspace', '2025-01-28', 12.00, 22,
    'instantly', 'paused', 81, now() - interval '14 days',
    'Paused during domain DNS migration'
  ),
  (
    'a1000001-0000-4000-8000-000000000008',
    'hello@vertex-demo.io', 'vertex-demo.io',
    'Google Workspace', '2024-11-10', 12.00, 18,
    'personal', 'warming', 65, now() - interval '2 days',
    'Cybersecurity vertical — conservative volume'
  ),
  (
    'a1000001-0000-4000-8000-000000000009',
    'legacy@lumen-demo.com', 'lumen-demo.com',
    'Zoho Mail', '2024-06-01', 8.00, 0,
    'smartlead', 'dead', 41, now() - interval '45 days',
    'Retired — high bounce rate on retail list'
  ),
  (
    'a1000001-0000-4000-8000-00000000000a',
    'team@summit-edu-demo.org', 'summit-edu-demo.org',
    'Microsoft 365', '2025-05-01', 10.00, 15,
    'personal', 'paused', 90, now() - interval '8 days',
    'Paused while EdTech campaign on hold'
  );

-- ============ CONTACTS (38) ============
INSERT INTO contacts (
  id, first_name, last_name, email, company, company_domain, title, state, phone,
  linkedin_url, vertical, source, assignment, status, sourced_date, last_contacted_date, notes
) VALUES
  -- Pipeline contacts (leads below)
  (
    'c1000001-0000-4000-8000-000000000001',
    'Morgan', 'Reed', 'morgan.reed@northwind-logistics.com',
    'Northwind Logistics', 'northwind-logistics.com', 'VP Operations', 'IL', '555-0101',
    'https://linkedin.com/in/demo-morgan-reed', 'Logistics', 'Apollo', 'personal', 'responded',
    now() - interval '21 days', now() - interval '2 days',
    'Met at Manifest conference — interested in warehouse automation.'
  ),
  (
    'c1000001-0000-4000-8000-000000000002',
    'Jordan', 'Blake', 'jordan.blake@brightpath-health.com',
    'Brightpath Health', 'brightpath-health.com', 'Director of Growth', 'TX', '555-0102',
    'https://linkedin.com/in/demo-jordan-blake', 'Healthcare SaaS', 'LinkedIn', 'instantly', 'responded',
    now() - interval '18 days', now() - interval '5 days',
    'HIPAA compliance is a hard requirement for any pilot.'
  ),
  (
    'c1000001-0000-4000-8000-000000000003',
    'Casey', 'Nguyen', 'casey.nguyen@harborline-finance.com',
    'Harborline Finance', 'harborline-finance.com', 'Head of RevOps', 'CA', '555-0103',
    'https://linkedin.com/in/demo-casey-nguyen', 'Fintech', 'Referral', 'smartlead', 'qualified',
    now() - interval '30 days', now() - interval '1 day',
    'Champion internally — CFO sign-off pending.'
  ),
  (
    'c1000001-0000-4000-8000-000000000004',
    'Taylor', 'Kim', 'taylor.kim@atlas-manufacturing.com',
    'Atlas Manufacturing', 'atlas-manufacturing.com', 'Plant Manager', 'OH', '555-0105',
    'https://linkedin.com/in/demo-taylor-kim', 'Manufacturing', 'Cold email', 'personal', 'responded',
    now() - interval '45 days', now() - interval '3 days',
    'Bringing IT director to next call.'
  ),
  (
    'c1000001-0000-4000-8000-000000000005',
    'Quinn', 'Foster', 'quinn.foster@vertex-security.com',
    'Vertex Security', 'vertex-security.com', 'CEO', 'WA', '555-0107',
    'https://linkedin.com/in/demo-quinn-foster', 'Cybersecurity', 'Inbound', 'personal', 'responded',
    now() - interval '14 days', now() - interval '4 days',
    'Found us via podcast — wants SOC2-friendly workflow.'
  ),
  (
    'c1000001-0000-4000-8000-000000000006',
    'Avery', 'Chen', 'avery.chen@lumen-retail.com',
    'Lumen Retail', 'lumen-retail.com', 'CMO', 'FL', '555-0106',
    'https://linkedin.com/in/demo-avery-chen', 'Retail', 'Apollo', 'instantly', 'disqualified',
    now() - interval '60 days', now() - interval '20 days',
    'Budget freeze — closed lost.'
  ),
  (
    'c1000001-0000-4000-8000-000000000007',
    'Dana', 'Walsh', 'dana.walsh@pioneer-hr.com',
    'Pioneer HR', 'pioneer-hr.com', 'VP People', 'MA', '555-0110',
    'https://linkedin.com/in/demo-dana-walsh', 'HR Tech', 'LinkedIn', 'personal', 'responded',
    now() - interval '25 days', now() - interval '1 day',
    'Great discovery call — needs post-meeting recap.'
  ),
  (
    'c1000001-0000-4000-8000-000000000008',
    'Eli', 'Martinez', 'eli.martinez@cloudbridge.io',
    'Cloudbridge', 'cloudbridge.io', 'CTO', 'CO', '555-0111',
    'https://linkedin.com/in/demo-eli-martinez', 'Cloud Infrastructure', 'Referral', 'personal', 'qualified',
    now() - interval '12 days', now() - interval '6 hours',
    'Follow-up overdue — technical eval in progress.'
  ),
  (
    'c1000001-0000-4000-8000-000000000009',
    'Finn', 'O''Brien', 'finn.obrien@sterling-legal.com',
    'Sterling Legal Partners', 'sterling-legal.com', 'Managing Partner', 'NY', '555-0112',
    'https://linkedin.com/in/demo-finn-obrien', 'Legal', 'Cold email', 'personal', 'responded',
    now() - interval '8 days', now() - interval '2 days',
    'Awaiting reply on pricing tiers — nudge due.'
  ),
  (
    'c1000001-0000-4000-8000-00000000000a',
    'Gray', 'Sato', 'gray.sato@nexgen-biotech.com',
    'NexGen Biotech', 'nexgen-biotech.com', 'Director of Ops', 'CA', '555-0113',
    'https://linkedin.com/in/demo-gray-sato', 'Biotech', 'Conference', 'smartlead', 'responded',
    now() - interval '6 days', now() - interval '3 days',
    'No follow-up date set — entered responded 5+ days ago.'
  ),
  (
    'c1000001-0000-4000-8000-00000000000b',
    'Harper', 'Jones', 'harper.jones@ridgeline-construction.com',
    'Ridgeline Construction', 'ridgeline-construction.com', 'COO', 'AZ', '555-0114',
    'https://linkedin.com/in/demo-harper-jones', 'Construction', 'Apollo', 'personal', 'qualified',
    now() - interval '35 days', now() - interval '7 days',
    'Post-meeting email sent — nurturing toward 2nd call.'
  ),
  (
    'c1000001-0000-4000-8000-00000000000c',
    'Indigo', 'Rossi', 'indigo.rossi@meridian-media.com',
    'Meridian Media', 'meridian-media.com', 'Head of Sales', 'IL', '555-0115',
    'https://linkedin.com/in/demo-indigo-rossi', 'Media', 'LinkedIn', 'instantly', 'responded',
    now() - interval '20 days', now() - interval '10 days',
    'No-show on first booked slot — rescheduled.'
  ),
  (
    'c1000001-0000-4000-8000-00000000000d',
    'Jules', 'Park', 'jules.park@quantum-insurance.com',
    'Quantum Insurance', 'quantum-insurance.com', 'Chief Actuary', 'CT', '555-0116',
    'https://linkedin.com/in/demo-jules-park', 'Insurance', 'Referral', 'personal', 'qualified',
    now() - interval '50 days', now() - interval '2 days',
    'Closed won — annual contract signed.'
  ),
  (
    'c1000001-0000-4000-8000-00000000000e',
    'Kai', 'Andersson', 'kai.andersson@nordic-foods.com',
    'Nordic Foods Co', 'nordic-foods.com', 'Supply Chain Director', 'MN', '555-0117',
    'https://linkedin.com/in/demo-kai-andersson', 'Food & Beverage', 'Cold email', 'smartlead', 'responded',
    now() - interval '40 days', now() - interval '30 days',
    'Ghosted after proposal — closed.'
  ),
  (
    'c1000001-0000-4000-8000-00000000000f',
    'Logan', 'Brooks', 'logan.brooks@apex-realestate.com',
    'Apex Real Estate', 'apex-realestate.com', 'Broker Owner', 'FL', '555-0118',
    'https://linkedin.com/in/demo-logan-brooks', 'Real Estate', 'Apollo', 'instantly', 'disqualified',
    now() - interval '22 days', now() - interval '15 days',
    'Wrong ICP — residential focus only.'
  ),
  (
    'c1000001-0000-4000-8000-000000000010',
    'Morgan', 'Hayes', 'morgan.hayes@silverline-saas.com',
    'Silverline SaaS', 'silverline-saas.com', 'CRO', 'UT', '555-0119',
    'https://linkedin.com/in/demo-morgan-hayes', 'B2B SaaS', 'Inbound', 'personal', 'qualified',
    now() - interval '55 days', now() - interval '5 days',
    'Lost to competitor on price.'
  ),
  (
    'c1000001-0000-4000-8000-000000000011',
    'Noah', 'Singh', 'noah.singh@horizon-logistics.com',
    'Horizon Logistics', 'horizon-logistics.com', 'Director of Fleet', 'GA', '555-0120',
    'https://linkedin.com/in/demo-noah-singh', 'Logistics', 'LinkedIn', 'smartlead', 'responded',
    now() - interval '28 days', now() - interval '8 days',
    'No budget until Q4 — timing loss.'
  ),
  (
    'c1000001-0000-4000-8000-000000000012',
    'Parker', 'Liu', 'parker.liu@stellar-pharma.com',
    'Stellar Pharma', 'stellar-pharma.com', 'VP Commercial', 'NJ', '555-0121',
    'https://linkedin.com/in/demo-parker-liu', 'Pharma', 'Conference', 'personal', 'qualified',
    now() - interval '70 days', now() - interval '4 days',
    'Won enterprise deal — reference customer candidate.'
  ),
  (
    'c1000001-0000-4000-8000-000000000013',
    'Reese', 'Dubois', 'reese.dubois@atelier-design.com',
    'Atelier Design Studio', 'atelier-design.com', 'Creative Director', 'OR', '555-0122',
    'https://linkedin.com/in/demo-reese-dubois', 'Creative Agency', 'Cold email', 'instantly', 'responded',
    now() - interval '16 days', now() - interval '1 day',
    'Meeting taken — proposal path.'
  ),
  (
    'c1000001-0000-4000-8000-000000000014',
    'Sage', 'Okonkwo', 'sage.okonkwo@terra-energy.com',
    'Terra Energy', 'terra-energy.com', 'Procurement Lead', 'TX', '555-0123',
    'https://linkedin.com/in/demo-sage-okonkwo', 'Energy', 'Apollo', 'smartlead', 'responded',
    now() - interval '19 days', now() - interval '2 days',
    '2nd call booked — proposal not yet sent.'
  ),
  (
    'c1000001-0000-4000-8000-000000000015',
    'Tatum', 'Reed', 'tatum.reed@blueoak-edu.com',
    'Blue Oak Education', 'blueoak-edu.com', 'Superintendent', 'NC', '555-0124',
    'https://linkedin.com/in/demo-tatum-reed', 'EdTech', 'Referral', 'personal', 'qualified',
    now() - interval '33 days', now() - interval '6 days',
    'Proposal out — decision by Friday.'
  ),
  (
    'c1000001-0000-4000-8000-000000000016',
    'Uma', 'Patel', 'uma.patel@velocity-fintech.com',
    'Velocity Fintech', 'velocity-fintech.com', 'Head of Partnerships', 'CA', '555-0125',
    'https://linkedin.com/in/demo-uma-patel', 'Fintech', 'LinkedIn', 'personal', 'responded',
    now() - interval '9 days', now() - interval '12 hours',
    'Fresh reply — early pipeline.'
  ),
  (
    'c1000001-0000-4000-8000-000000000017',
    'Vale', 'Kimura', 'vale.kimura@pacific-shipping.com',
    'Pacific Shipping Group', 'pacific-shipping.com', 'Operations Manager', 'WA', '555-0126',
    'https://linkedin.com/in/demo-vale-kimura', 'Maritime', 'Cold email', 'instantly', 'responded',
    now() - interval '11 days', now() - interval '3 days',
    'Requested meeting — calendar link sent.'
  ),
  (
    'c1000001-0000-4000-8000-000000000018',
    'Wren', 'Cole', 'wren.cole@cascade-sports.com',
    'Cascade Sports', 'cascade-sports.com', 'Marketing VP', 'CO', '555-0127',
    'https://linkedin.com/in/demo-wren-cole', 'Sports & Retail', 'Apollo', 'smartlead', 'responded',
    now() - interval '24 days', now() - interval '5 days',
    'Meeting booked for next week.'
  ),
  -- Contacts without leads (outreach pool + top of funnel)
  (
    'c1000001-0000-4000-8000-000000000019',
    'Riley', 'Patel', 'riley.patel@summit-edu.org',
    'Summit Education Group', 'summit-edu.org', 'COO', 'NY', '555-0104',
    'https://linkedin.com/in/demo-riley-patel', 'EdTech', 'Apollo', 'unassigned', 'sourced',
    now() - interval '7 days', null,
    'New import — not yet assigned to a sequence.'
  ),
  (
    'c1000001-0000-4000-8000-00000000001a',
    'Sam', 'Okafor', 'sam.okafor@greenfield-energy.com',
    'Greenfield Energy', 'greenfield-energy.com', 'Director of Procurement', 'CO', '555-0108',
    'https://linkedin.com/in/demo-sam-okafor', 'Energy', 'LinkedIn', 'smartlead', 'contacted',
    now() - interval '10 days', now() - interval '6 days',
    'In Smartlead sequence — touch 2 of 4.'
  ),
  (
    'c1000001-0000-4000-8000-00000000001b',
    'Blake', 'Torres', 'blake.torres@ironwood-capital.com',
    'Ironwood Capital', 'ironwood-capital.com', 'Principal', 'NY', '555-0128',
    'https://linkedin.com/in/demo-blake-torres', 'Private Equity', 'Apollo', 'unassigned', 'sourced',
    now() - interval '5 days', null, null
  ),
  (
    'c1000001-0000-4000-8000-00000000001c',
    'Cameron', 'Wu', 'cameron.wu@lattice-analytics.com',
    'Lattice Analytics', 'lattice-analytics.com', 'Head of Data', 'CA', '555-0129',
    'https://linkedin.com/in/demo-cameron-wu', 'Data & Analytics', 'Conference', 'unassigned', 'sourced',
    now() - interval '4 days', null, null
  ),
  (
    'c1000001-0000-4000-8000-00000000001d',
    'Drew', 'Hassan', 'drew.hassan@oakmont-health.com',
    'Oakmont Health', 'oakmont-health.com', 'CIO', 'PA', '555-0130',
    'https://linkedin.com/in/demo-drew-hassan', 'Healthcare', 'Referral', 'unassigned', 'sourced',
    now() - interval '3 days', null, null
  ),
  (
    'c1000001-0000-4000-8000-00000000001e',
    'Emery', 'Voss', 'emery.voss@redstone-mining.com',
    'Redstone Mining', 'redstone-mining.com', 'Site Director', 'NV', '555-0131',
    'https://linkedin.com/in/demo-emery-voss', 'Mining', 'Apollo', 'unassigned', 'sourced',
    now() - interval '2 days', null, null
  ),
  (
    'c1000001-0000-4000-8000-00000000001f',
    'Frankie', 'Nakamura', 'frankie.nakamura@pulse-telecom.com',
    'Pulse Telecom', 'pulse-telecom.com', 'VP Sales', 'TX', '555-0132',
    'https://linkedin.com/in/demo-frankie-nakamura', 'Telecom', 'LinkedIn', 'unassigned', 'sourced',
    now() - interval '1 day', null, null
  ),
  (
    'c1000001-0000-4000-8000-000000000020',
    'Glen', 'Fischer', 'glen.fischer@harbor-credit.com',
    'Harbor Credit Union', 'harbor-credit.com', 'Branch President', 'ME', '555-0133',
    'https://linkedin.com/in/demo-glen-fischer', 'Financial Services', 'Cold email', 'unassigned', 'sourced',
    now() - interval '6 days', null, null
  ),
  (
    'c1000001-0000-4000-8000-000000000021',
    'Hollis', 'Bryant', 'hollis.bryant@sunrise-agri.com',
    'Sunrise Agriculture', 'sunrise-agri.com', 'GM', 'IA', '555-0134',
    'https://linkedin.com/in/demo-hollis-bryant', 'Agriculture', 'Apollo', 'unassigned', 'sourced',
    now() - interval '8 days', null, null
  ),
  (
    'c1000001-0000-4000-8000-000000000022',
    'Ivan', 'Petrov', 'ivan.petrov@baltic-shipping.com',
    'Baltic Shipping', 'baltic-shipping.com', 'Fleet Manager', 'MD', '555-0135',
    'https://linkedin.com/in/demo-ivan-petrov', 'Maritime', 'LinkedIn', 'instantly', 'contacted',
    now() - interval '14 days', now() - interval '9 days',
    'Opened last email — no reply yet.'
  ),
  (
    'c1000001-0000-4000-8000-000000000023',
    'Jo', 'Ellison', 'jo.ellison@crestview-hotels.com',
    'Crestview Hotels', 'crestview-hotels.com', 'Revenue Manager', 'TN', '555-0136',
    'https://linkedin.com/in/demo-jo-ellison', 'Hospitality', 'Apollo', 'instantly', 'contacted',
    now() - interval '12 days', now() - interval '7 days', null
  ),
  (
    'c1000001-0000-4000-8000-000000000024',
    'Kit', 'Mensah', 'kit.mensah@urban-grid.com',
    'Urban Grid Utilities', 'urban-grid.com', 'Regulatory Affairs', 'DC', '555-0137',
    'https://linkedin.com/in/demo-kit-mensah', 'Utilities', 'Conference', 'smartlead', 'contacted',
    now() - interval '9 days', now() - interval '4 days', null
  ),
  (
    'c1000001-0000-4000-8000-000000000025',
    'Lane', 'Ortiz', 'lane.ortiz@prism-software.com',
    'Prism Software', 'prism-software.com', 'Product Lead', 'WA', '555-0138',
    'https://linkedin.com/in/demo-lane-ortiz', 'B2B SaaS', 'Inbound', 'unassigned', 'qualified',
    now() - interval '15 days', now() - interval '11 days',
    'Inbound demo request — assign to personal sequence.'
  ),
  (
    'c1000001-0000-4000-8000-000000000026',
    'Micah', 'Stern', 'micah.stern@evergreen-nonprofit.org',
    'Evergreen Foundation', 'evergreen-nonprofit.org', 'Executive Director', 'OR', '555-0139',
    'https://linkedin.com/in/demo-micah-stern', 'Nonprofit', 'Referral', 'unassigned', 'sourced',
    now() - interval '11 days', null,
    'Grant-funded org — may be non-fit but worth a look.'
  );

-- ============ LEADS (18 — one per pipeline contact) ============
INSERT INTO leads (
  id, contact_id, status, notes, meeting_transcript,
  followup_cadence_days, next_followup_at, last_followup_at, followup_count,
  noshow_count, proposal_made, post_meeting_email_sent, awaiting_response_since,
  deal_value, personal_email_account_id, status_entered_at
) VALUES
  (
    'b1000001-0000-4000-8000-000000000001',
    'c1000001-0000-4000-8000-000000000001',
    'meeting_booked',
    'Interested in workflow automation pilot for 3 warehouses.',
    null,
    3, now() + interval '2 days', now() - interval '4 days', 1,
    0, false, true, null,
    48000, 'a1000001-0000-4000-8000-000000000001', now() - interval '5 days'
  ),
  (
    'b1000001-0000-4000-8000-000000000002',
    'c1000001-0000-4000-8000-000000000002',
    'meeting_requested',
    'Asked for case studies in HIPAA-compliant outreach.',
    null,
    4, now() + interval '1 day', null, 0,
    0, false, false, null,
    32000, null, now() - interval '3 days'
  ),
  (
    'b1000001-0000-4000-8000-000000000003',
    'c1000001-0000-4000-8000-000000000003',
    'proposal_sent',
    'Sent tiered pricing; decision expected end of month.',
    E'Discovery recap:\n- 120-seat RevOps team\n- Needs Salesforce + HubSpot sync\n- Timeline: 6-week rollout',
    5, now() + interval '4 days', now() - interval '6 days', 2,
    0, true, true, now() - interval '3 days',
    96000, 'a1000001-0000-4000-8000-000000000005', now() - interval '12 days'
  ),
  (
    'b1000001-0000-4000-8000-000000000004',
    'c1000001-0000-4000-8000-000000000004',
    '2nd_call_booked',
    'Technical stakeholder joining next call.',
    E'First call notes:\n- Plant downtime costs ~$40k/hour\n- Wants integration with SAP\n- Budget holder is CFO',
    5, now() + interval '3 days', now() - interval '2 days', 1,
    0, false, true, null,
    55000, 'a1000001-0000-4000-8000-000000000001', now() - interval '8 days'
  ),
  (
    'b1000001-0000-4000-8000-000000000005',
    'c1000001-0000-4000-8000-000000000005',
    'responded',
    'Replied positively to initial sequence.',
    null,
    3, now() + interval '2 days', null, 0,
    0, false, false, null,
    null, 'a1000001-0000-4000-8000-000000000001', now() - interval '2 days'
  ),
  (
    'b1000001-0000-4000-8000-000000000006',
    'c1000001-0000-4000-8000-000000000006',
    'closed',
    'Budget freeze — revisit Q3.',
    null,
    null, null, now() - interval '18 days', 3,
    0, false, false, null,
    0, null, now() - interval '25 days'
  ),
  (
    'b1000001-0000-4000-8000-000000000007',
    'c1000001-0000-4000-8000-000000000007',
    'meeting_taken',
    'Strong fit for HR onboarding automation.',
    E'Meeting transcript (demo):\nDana walked through current manual onboarding checklist.\nPain: 6 tools, no single source of truth.\nNext: send recap + pilot scope.',
    3, now() + interval '1 day', null, 0,
    0, false, false, null,
    42000, 'a1000001-0000-4000-8000-000000000002', now() - interval '2 days'
  ),
  (
    'b1000001-0000-4000-8000-000000000008',
    'c1000001-0000-4000-8000-000000000008',
    'proposal_sent',
    'Technical eval — security questionnaire in progress.',
    null,
    5, now() - interval '2 days', now() - interval '5 days', 2,
    0, true, true, null,
    78000, 'a1000001-0000-4000-8000-000000000001', now() - interval '14 days'
  ),
  (
    'b1000001-0000-4000-8000-000000000009',
    'c1000001-0000-4000-8000-000000000009',
    'meeting_requested',
    'Asked for references in legal vertical.',
    null,
    4, now() + interval '3 days', now() - interval '1 day', 1,
    0, false, false, now() - interval '3 days',
    65000, 'a1000001-0000-4000-8000-000000000002', now() - interval '6 days'
  ),
  (
    'b1000001-0000-4000-8000-00000000000a',
    'c1000001-0000-4000-8000-00000000000a',
    'responded',
    'Interested but busy — no follow-up date set yet.',
    null,
    3, null, null, 0,
    0, false, false, null,
    28000, null, now() - interval '5 days'
  ),
  (
    'b1000001-0000-4000-8000-00000000000b',
    'c1000001-0000-4000-8000-00000000000b',
    'meeting_taken',
    'Post-meeting email sent — scheduling 2nd call.',
    E'Harper wants ROI model for 4 job sites.\nDiscussed per-seat vs project-based pricing.',
    3, now() + interval '5 days', now() - interval '1 day', 0,
    0, false, true, null,
    88000, 'a1000001-0000-4000-8000-000000000001', now() - interval '7 days'
  ),
  (
    'b1000001-0000-4000-8000-00000000000c',
    'c1000001-0000-4000-8000-00000000000c',
    'meeting_booked',
    'Rescheduled after no-show.',
    null,
    null, now() + interval '4 days', null, 0,
    1, false, false, null,
    36000, null, now() - interval '3 days'
  ),
  (
    'b1000001-0000-4000-8000-00000000000d',
    'c1000001-0000-4000-8000-00000000000d',
    'closed',
    'Signed annual contract — onboarding kickoff scheduled.',
    E'Final call: signed 12-month agreement at $9,500/mo.',
    null, null, now() - interval '3 days', 1,
    0, true, true, null,
    114000, 'a1000001-0000-4000-8000-000000000002', now() - interval '10 days'
  ),
  (
    'b1000001-0000-4000-8000-00000000000e',
    'c1000001-0000-4000-8000-00000000000e',
    'closed',
    'Stopped replying after proposal.',
    null,
    null, null, now() - interval '25 days', 4,
    0, true, true, null,
    0, 'a1000001-0000-4000-8000-000000000005', now() - interval '35 days'
  ),
  (
    'b1000001-0000-4000-8000-00000000000f',
    'c1000001-0000-4000-8000-00000000000f',
    'closed',
    'Residential brokerage — not our ICP.',
    null,
    null, null, null, 0,
    0, false, false, null,
    0, null, now() - interval '18 days'
  ),
  (
    'b1000001-0000-4000-8000-000000000010',
    'c1000001-0000-4000-8000-000000000010',
    'closed',
    'Chose Outreach.io on price.',
    null,
    null, null, now() - interval '8 days', 2,
    0, true, true, null,
    0, 'a1000001-0000-4000-8000-000000000001', now() - interval '20 days'
  ),
  (
    'b1000001-0000-4000-8000-000000000011',
    'c1000001-0000-4000-8000-000000000011',
    'closed',
    'Likes product but budget locked until Q4.',
    null,
    null, null, now() - interval '12 days', 2,
    0, false, true, null,
    0, null, now() - interval '22 days'
  ),
  (
    'b1000001-0000-4000-8000-000000000012',
    'c1000001-0000-4000-8000-000000000012',
    'closed',
    'Enterprise win — 3-year deal.',
    E'Closed after exec sponsor call.\nExpansion potential in EU next year.',
    null, null, now() - interval '2 days', 0,
    0, true, true, null,
    185000, 'a1000001-0000-4000-8000-000000000002', now() - interval '5 days'
  ),
  (
    'b1000001-0000-4000-8000-000000000013',
    'c1000001-0000-4000-8000-000000000013',
    '2nd_call_booked',
    'Creative agency — wants white-label option.',
    null,
    5, now() + interval '6 days', null, 0,
    0, false, true, null,
    44000, 'a1000001-0000-4000-8000-000000000008', now() - interval '4 days'
  ),
  (
    'b1000001-0000-4000-8000-000000000014',
    'c1000001-0000-4000-8000-000000000014',
    '2nd_call_booked',
    'Energy procurement — multi-site rollout.',
    null,
    5, now() + interval '2 days', now() - interval '3 days', 1,
    0, false, true, null,
    72000, 'a1000001-0000-4000-8000-000000000005', now() - interval '9 days'
  ),
  (
    'b1000001-0000-4000-8000-000000000015',
    'c1000001-0000-4000-8000-000000000015',
    'proposal_sent',
    'School district pilot — 3 campuses.',
    null,
    5, now() + interval '1 day', now() - interval '7 days', 1,
    0, true, true, null,
    52000, 'a1000001-0000-4000-8000-00000000000a', now() - interval '11 days'
  ),
  (
    'b1000001-0000-4000-8000-000000000016',
    'c1000001-0000-4000-8000-000000000016',
    'responded',
    'Partnership motion — early exploration.',
    null,
    3, now() + interval '3 days', null, 0,
    0, false, false, null,
    null, 'a1000001-0000-4000-8000-000000000008', now() - interval '1 day'
  ),
  (
    'b1000001-0000-4000-8000-000000000017',
    'c1000001-0000-4000-8000-000000000017',
    'meeting_requested',
    'Maritime ops — asked for deck before booking.',
    null,
    4, now() + interval '2 days', null, 0,
    0, false, false, null,
    38000, null, now() - interval '4 days'
  ),
  (
    'b1000001-0000-4000-8000-000000000018',
    'c1000001-0000-4000-8000-000000000018',
    'meeting_booked',
    'Sports retail — seasonal campaign timing.',
    null,
    null, now() + interval '5 days', null, 0,
    0, false, false, null,
    29000, 'a1000001-0000-4000-8000-000000000001', now() - interval '2 days'
  );

UPDATE leads SET closed_reason = 'lost', close_lost_reason = 'timing'
  WHERE id = 'b1000001-0000-4000-8000-000000000006';
UPDATE leads SET closed_reason = 'won', close_lost_reason = null
  WHERE id IN (
    'b1000001-0000-4000-8000-00000000000d',
    'b1000001-0000-4000-8000-000000000012'
  );
UPDATE leads SET closed_reason = 'ghosted', close_lost_reason = 'ghosted'
  WHERE id = 'b1000001-0000-4000-8000-00000000000e';
UPDATE leads SET closed_reason = 'non_fit', close_lost_reason = 'wrong_fit'
  WHERE id = 'b1000001-0000-4000-8000-00000000000f';
UPDATE leads SET closed_reason = 'lost', close_lost_reason = 'went_with_competitor'
  WHERE id = 'b1000001-0000-4000-8000-000000000010';
UPDATE leads SET closed_reason = 'lost', close_lost_reason = 'no_budget'
  WHERE id = 'b1000001-0000-4000-8000-000000000011';

-- ============ LEAD ACTIVITY ============
INSERT INTO lead_activity (lead_id, activity_type, description, created_at) VALUES
  ('b1000001-0000-4000-8000-000000000001', 'created', 'Added to pipeline', now() - interval '14 days'),
  ('b1000001-0000-4000-8000-000000000001', 'status', 'Moved from Responded to Meeting Booked', now() - interval '5 days'),
  ('b1000001-0000-4000-8000-000000000001', 'followup', 'Followed up', now() - interval '4 days'),
  ('b1000001-0000-4000-8000-000000000002', 'created', 'Added to pipeline', now() - interval '10 days'),
  ('b1000001-0000-4000-8000-000000000002', 'status', 'Moved to Meeting Requested', now() - interval '3 days'),
  ('b1000001-0000-4000-8000-000000000003', 'created', 'Added to pipeline', now() - interval '20 days'),
  ('b1000001-0000-4000-8000-000000000003', 'followup', 'Followed up', now() - interval '6 days'),
  ('b1000001-0000-4000-8000-000000000003', 'status', 'Proposal sent', now() - interval '12 days'),
  ('b1000001-0000-4000-8000-000000000004', 'created', 'Added to pipeline', now() - interval '15 days'),
  ('b1000001-0000-4000-8000-000000000004', 'status', '2nd call booked', now() - interval '8 days'),
  ('b1000001-0000-4000-8000-000000000005', 'created', 'Added to pipeline', now() - interval '4 days'),
  ('b1000001-0000-4000-8000-000000000006', 'created', 'Added to pipeline', now() - interval '40 days'),
  ('b1000001-0000-4000-8000-000000000006', 'status', 'Closed — timing', now() - interval '25 days'),
  ('b1000001-0000-4000-8000-000000000007', 'created', 'Added to pipeline', now() - interval '8 days'),
  ('b1000001-0000-4000-8000-000000000007', 'status', 'Meeting taken', now() - interval '2 days'),
  ('b1000001-0000-4000-8000-000000000008', 'created', 'Added to pipeline', now() - interval '16 days'),
  ('b1000001-0000-4000-8000-000000000008', 'followup', 'Followed up', now() - interval '5 days'),
  ('b1000001-0000-4000-8000-000000000009', 'created', 'Added to pipeline', now() - interval '7 days'),
  ('b1000001-0000-4000-8000-000000000009', 'followup', 'Followed up', now() - interval '1 day'),
  ('b1000001-0000-4000-8000-00000000000a', 'created', 'Added to pipeline', now() - interval '6 days'),
  ('b1000001-0000-4000-8000-00000000000b', 'created', 'Added to pipeline', now() - interval '18 days'),
  ('b1000001-0000-4000-8000-00000000000b', 'status', 'Meeting taken', now() - interval '7 days'),
  ('b1000001-0000-4000-8000-00000000000c', 'created', 'Added to pipeline', now() - interval '12 days'),
  ('b1000001-0000-4000-8000-00000000000c', 'noshow', 'No-show logged', now() - interval '6 days'),
  ('b1000001-0000-4000-8000-00000000000d', 'created', 'Added to pipeline', now() - interval '45 days'),
  ('b1000001-0000-4000-8000-00000000000d', 'status', 'Closed won', now() - interval '10 days'),
  ('b1000001-0000-4000-8000-00000000000e', 'created', 'Added to pipeline', now() - interval '50 days'),
  ('b1000001-0000-4000-8000-00000000000e', 'followup', 'Final follow-up sent', now() - interval '25 days'),
  ('b1000001-0000-4000-8000-00000000000f', 'created', 'Added to pipeline', now() - interval '20 days'),
  ('b1000001-0000-4000-8000-00000000000f', 'status', 'Closed non-fit', now() - interval '18 days'),
  ('b1000001-0000-4000-8000-000000000010', 'created', 'Added to pipeline', now() - interval '30 days'),
  ('b1000001-0000-4000-8000-000000000011', 'created', 'Added to pipeline', now() - interval '28 days'),
  ('b1000001-0000-4000-8000-000000000012', 'created', 'Added to pipeline', now() - interval '75 days'),
  ('b1000001-0000-4000-8000-000000000012', 'status', 'Closed won', now() - interval '5 days'),
  ('b1000001-0000-4000-8000-000000000013', 'created', 'Added to pipeline', now() - interval '10 days'),
  ('b1000001-0000-4000-8000-000000000014', 'created', 'Added to pipeline', now() - interval '14 days'),
  ('b1000001-0000-4000-8000-000000000015', 'created', 'Added to pipeline', now() - interval '22 days'),
  ('b1000001-0000-4000-8000-000000000016', 'created', 'Added to pipeline', now() - interval '2 days'),
  ('b1000001-0000-4000-8000-000000000017', 'created', 'Added to pipeline', now() - interval '5 days'),
  ('b1000001-0000-4000-8000-000000000018', 'created', 'Added to pipeline', now() - interval '6 days');

-- ============ MEETING BOOKED EVENTS (spread over 12 weeks for analytics) ============
INSERT INTO lead_meeting_booked_events (lead_id, booked_on) VALUES
  ('b1000001-0000-4000-8000-000000000001', (now() - interval '5 days')::date),
  ('b1000001-0000-4000-8000-000000000004', (now() - interval '8 days')::date),
  ('b1000001-0000-4000-8000-00000000000b', (now() - interval '14 days')::date),
  ('b1000001-0000-4000-8000-00000000000c', (now() - interval '7 days')::date),
  ('b1000001-0000-4000-8000-00000000000d', (now() - interval '21 days')::date),
  ('b1000001-0000-4000-8000-000000000007', (now() - interval '3 days')::date),
  ('b1000001-0000-4000-8000-000000000012', (now() - interval '12 days')::date),
  ('b1000001-0000-4000-8000-000000000018', (now() - interval '2 days')::date),
  ('b1000001-0000-4000-8000-000000000003', (now() - interval '28 days')::date),
  ('b1000001-0000-4000-8000-000000000008', (now() - interval '18 days')::date),
  ('b1000001-0000-4000-8000-000000000010', (now() - interval '35 days')::date),
  ('b1000001-0000-4000-8000-000000000011', (now() - interval '42 days')::date),
  ('b1000001-0000-4000-8000-00000000000e', (now() - interval '38 days')::date),
  ('b1000001-0000-4000-8000-000000000013', (now() - interval '6 days')::date),
  ('b1000001-0000-4000-8000-000000000014', (now() - interval '10 days')::date),
  ('b1000001-0000-4000-8000-000000000015', (now() - interval '16 days')::date),
  ('b1000001-0000-4000-8000-000000000006', (now() - interval '48 days')::date),
  ('b1000001-0000-4000-8000-00000000000f', (now() - interval '20 days')::date),
  ('b1000001-0000-4000-8000-000000000005', (now() - interval '1 day')::date),
  ('b1000001-0000-4000-8000-000000000009', (now() - interval '4 days')::date),
  ('b1000001-0000-4000-8000-000000000002', current_date),
  ('b1000001-0000-4000-8000-000000000017', (now() - interval '9 days')::date);

-- ============ EMAIL TEMPLATES (10) ============
INSERT INTO templates (id, name, subject_line, body, last_used_date) VALUES
  (
    'e1000001-0000-4000-8000-000000000001',
    'Intro — ops leaders',
    'Quick idea for {{company}}',
    E'Hi {{first_name}},\n\nI noticed {{company}} is scaling regional operations. We help teams like yours cut manual follow-up work by ~30%.\n\nOpen to a 15-minute call next week?\n\n— Alex',
    now() - interval '2 days'
  ),
  (
    'e1000001-0000-4000-8000-000000000002',
    'Follow-up — no reply',
    'Re: {{company}} outreach workflow',
    E'Hi {{first_name}},\n\nCircling back in case this got buried. Happy to share a one-page overview tailored to {{vertical}}.\n\nBest,\nAlex',
    now() - interval '5 days'
  ),
  (
    'e1000001-0000-4000-8000-000000000003',
    'Intro — healthcare compliance',
    'HIPAA-safe outreach for {{company}}',
    E'Hi {{first_name}},\n\n{{company}}''s growth in {{vertical}} caught my eye. We work with several HIPAA-covered entities on compliant outbound.\n\nWorth a brief chat?\n\n— Alex',
    now() - interval '8 days'
  ),
  (
    'e1000001-0000-4000-8000-000000000004',
    'Intro — fintech RevOps',
    'RevOps automation at {{company}}',
    E'Hi {{first_name}},\n\nRevOps teams at {{vertical}} companies use us to unify follow-ups across Salesforce and their sequencer.\n\n15 minutes to compare notes?\n\n— Alex',
    now() - interval '1 day'
  ),
  (
    'e1000001-0000-4000-8000-000000000005',
    'Breakup — final touch',
    'Closing the loop — {{company}}',
    E'Hi {{first_name}},\n\nI''ll assume timing isn''t right for {{company}}. If priorities shift, I''m here.\n\nAll the best,\nAlex',
    now() - interval '30 days'
  ),
  (
    'e1000001-0000-4000-8000-000000000006',
    'Post-meeting recap',
    'Great speaking with you — {{company}} next steps',
    E'Hi {{first_name}},\n\nThanks for the time today. As discussed, here''s a short recap and proposed pilot scope for {{company}}.\n\nLet me know if Thursday works for a follow-up.\n\n— Alex',
    now() - interval '3 days'
  ),
  (
    'e1000001-0000-4000-8000-000000000007',
    'Intro — manufacturing',
    'Reducing downtime comms at {{company}}',
    E'Hi {{first_name}},\n\nPlant teams at manufacturers like {{company}} use us to standardize escalation when lines go down.\n\nOpen to a quick intro call?\n\n— Alex',
    null
  ),
  (
    'e1000001-0000-4000-8000-000000000008',
    'Referral ask',
    'Know anyone at similar {{vertical}} companies?',
    E'Hi {{first_name}},\n\nEven if {{company}} isn''t a fit right now, I''d appreciate an intro to anyone in {{vertical}} wrestling with outbound ops.\n\nThank you,\nAlex',
    null
  ),
  (
    'e1000001-0000-4000-8000-000000000009',
    'Meeting request — soft CTA',
    '15 min next week?',
    E'Hi {{first_name}},\n\nBased on what I''ve seen at {{company}}, I think we could shave hours off your weekly follow-up admin.\n\nDo you have 15 minutes next Tuesday or Wednesday?\n\n— Alex',
    now() - interval '12 days'
  ),
  (
    'e1000001-0000-4000-8000-00000000000a',
    'Case study offer',
    '{{vertical}} case study for {{company}}',
    E'Hi {{first_name}},\n\nWe just published results from a {{vertical}} customer with a similar team size to {{company}}.\n\nWant me to send the PDF?\n\n— Alex',
    now() - interval '6 days'
  );

-- ============ OUTREACH LOG (historical sends) ============
INSERT INTO outreach_log (
  contact_id, template_id, email_account_id, subject_sent, body_sent, sent_date
) VALUES
  (
    'c1000001-0000-4000-8000-000000000019',
    'e1000001-0000-4000-8000-000000000001',
    'a1000001-0000-4000-8000-000000000004',
    'Quick idea for Summit Education Group',
    E'Hi Riley,\n\nI noticed Summit Education Group is scaling regional operations...',
    now() - interval '6 days'
  ),
  (
    'c1000001-0000-4000-8000-00000000001b',
    'e1000001-0000-4000-8000-000000000004',
    'a1000001-0000-4000-8000-000000000004',
    'RevOps automation at Ironwood Capital',
    E'Hi Blake,\n\nRevOps teams at Private Equity companies use us...',
    now() - interval '4 days'
  ),
  (
    'c1000001-0000-4000-8000-00000000001c',
    'e1000001-0000-4000-8000-000000000001',
    'a1000001-0000-4000-8000-000000000003',
    'Quick idea for Lattice Analytics',
    E'Hi Cameron,\n\nI noticed Lattice Analytics is scaling...',
    now() - interval '3 days'
  ),
  (
    'c1000001-0000-4000-8000-00000000001a',
    'e1000001-0000-4000-8000-000000000002',
    'a1000001-0000-4000-8000-000000000005',
    'Re: Greenfield Energy outreach workflow',
    E'Hi Sam,\n\nCircling back in case this got buried...',
    now() - interval '6 days'
  ),
  (
    'c1000001-0000-4000-8000-000000000022',
    'e1000001-0000-4000-8000-000000000007',
    'a1000001-0000-4000-8000-000000000004',
    'Reducing downtime comms at Baltic Shipping',
    E'Hi Ivan,\n\nFleet teams at maritime companies...',
    now() - interval '9 days'
  ),
  (
    'c1000001-0000-4000-8000-000000000005',
    'e1000001-0000-4000-8000-000000000001',
    'a1000001-0000-4000-8000-000000000001',
    'Quick idea for Vertex Security',
    E'Hi Quinn,\n\nI noticed Vertex Security is scaling...',
    now() - interval '14 days'
  ),
  (
    'c1000001-0000-4000-8000-000000000001',
    'e1000001-0000-4000-8000-000000000009',
    'a1000001-0000-4000-8000-000000000001',
    '15 min next week?',
    E'Hi Morgan,\n\nBased on what I''ve seen at Northwind Logistics...',
    now() - interval '18 days'
  ),
  (
    'c1000001-0000-4000-8000-000000000002',
    'e1000001-0000-4000-8000-000000000003',
    'a1000001-0000-4000-8000-000000000003',
    'HIPAA-safe outreach for Brightpath Health',
    E'Hi Jordan,\n\nBrightpath Health''s growth in Healthcare SaaS caught my eye...',
    now() - interval '16 days'
  ),
  (
    'c1000001-0000-4000-8000-000000000020',
    'e1000001-0000-4000-8000-000000000001',
    'a1000001-0000-4000-8000-000000000004',
    'Quick idea for Harbor Credit Union',
    E'Hi Glen,\n\nI noticed Harbor Credit Union...',
    now() - interval '5 days'
  ),
  (
    'c1000001-0000-4000-8000-000000000021',
    'e1000001-0000-4000-8000-000000000007',
    'a1000001-0000-4000-8000-000000000003',
    'Reducing downtime comms at Sunrise Agriculture',
    E'Hi Hollis,\n\nAg operations teams...',
    now() - interval '7 days'
  ),
  (
    'c1000001-0000-4000-8000-000000000006',
    'e1000001-0000-4000-8000-000000000005',
    'a1000001-0000-4000-8000-000000000004',
    'Closing the loop — Lumen Retail',
    E'Hi Avery,\n\nI''ll assume timing isn''t right...',
    now() - interval '20 days'
  ),
  (
    'c1000001-0000-4000-8000-00000000000e',
    'e1000001-0000-4000-8000-000000000005',
    'a1000001-0000-4000-8000-000000000005',
    'Closing the loop — Nordic Foods Co',
    E'Hi Kai,\n\nI''ll assume timing isn''t right...',
    now() - interval '28 days'
  );

-- ============ TODOS (18) ============
INSERT INTO todos (text, done, priority, position) VALUES
  ('Prep demo deck for Northwind call', false, true, 0),
  ('Update Harborline proposal pricing table', false, true, 1),
  ('Send post-meeting email to Dana Walsh (Pioneer HR)', false, true, 2),
  ('Follow up with Eli Martinez — overdue', false, true, 3),
  ('Make proposal for Taylor Kim (Atlas Manufacturing)', false, true, 4),
  ('Nudge Finn O''Brien — awaiting reply 3+ days', false, true, 5),
  ('Set follow-up date for Gray Sato (NexGen Biotech)', false, false, 6),
  ('Review Instantly warmup scores', false, false, 7),
  ('Assign Prism Software inbound to personal sequence', false, false, 8),
  ('Pause legacy@lumen-demo.com in Smartlead', false, false, 9),
  ('Export Q2 meeting-booked report for team standup', false, false, 10),
  ('Draft case study blurb for Stellar Pharma win', false, false, 11),
  ('Reschedule Indigo Rossi after no-show', false, false, 12),
  ('Archive disqualified Lumen Retail contact', true, false, 13),
  ('Upload Quantum Insurance signed contract', true, false, 14),
  ('Rotate passwords on warming inboxes', true, false, 15),
  ('Clean up Apollo export duplicates', true, false, 16),
  ('Send breakup sequence to Crestview Hotels', true, false, 17);

-- ============ DAILY SENDING VOLUME (90 days — weekdays higher) ============
INSERT INTO daily_sending_volume (log_date, total_volume)
SELECT
  d::date,
  CASE
    WHEN EXTRACT(DOW FROM d) IN (0, 6) THEN 12 + (EXTRACT(DAY FROM d)::int % 8)
    ELSE 72 + (EXTRACT(DAY FROM d)::int % 25) + (EXTRACT(WEEK FROM d)::int % 5) * 3
  END
FROM generate_series(
  current_date - interval '89 days',
  current_date,
  interval '1 day'
) AS d;

COMMIT;

-- Demo CRM bootstrap: run once in a NEW Supabase project (SQL Editor).
-- Creates schema, RLS policies, RPC helpers, storage bucket, and sample data.
-- Do NOT run this against your production CRM database.

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  email text NOT NULL UNIQUE,
  company text,
  title text,
  state text,
  vertical text,
  assignment text NOT NULL DEFAULT 'unassigned'
    CHECK (assignment IN ('unassigned', 'instantly', 'smartlead', 'personal')),
  status text NOT NULL DEFAULT 'sourced'
    CHECK (status IN ('sourced', 'contacted', 'responded', 'qualified', 'disqualified')),
  sourced_date timestamptz,
  last_contacted_date timestamptz,
  company_domain text,
  phone text,
  linkedin_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_address text NOT NULL,
  provider text,
  purchase_date date,
  monthly_cost numeric,
  daily_volume integer DEFAULT 0,
  inbox_use text NOT NULL DEFAULT 'personal'
    CHECK (inbox_use IN ('personal', 'instantly', 'smartlead')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'warming', 'paused', 'dead')),
  last_mailreach_score integer,
  last_mailreach_notes text,
  last_mailreach_test_date timestamptz,
  mailreach_test_url text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL UNIQUE REFERENCES contacts(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'responded'
    CHECK (status IN (
      'responded',
      'meeting_requested',
      'meeting_booked',
      'meeting_taken',
      '2nd_call_booked',
      'proposal_sent',
      'closed'
    )),
  notes text,
  meeting_transcript text,
  meeting_transcript_path text,
  follow_up_date timestamptz,
  next_followup_at timestamptz,
  last_followup_at timestamptz,
  followup_count integer NOT NULL DEFAULT 0,
  followup_cadence_days integer,
  noshow_count integer NOT NULL DEFAULT 0,
  proposal_made boolean NOT NULL DEFAULT false,
  post_meeting_email_sent boolean NOT NULL DEFAULT false,
  awaiting_response_since timestamptz,
  closed_reason text CHECK (
    closed_reason IS NULL OR closed_reason IN ('won', 'lost', 'non_fit', 'ghosted')
  ),
  deal_value numeric,
  close_lost_reason text CHECK (
    close_lost_reason IS NULL OR close_lost_reason IN (
      'wrong_fit', 'no_budget', 'ghosted', 'went_with_competitor', 'timing', 'other'
    )
  ),
  personal_email_account_id uuid REFERENCES email_accounts(id) ON DELETE SET NULL,
  status_entered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_activity_lead_id_idx ON lead_activity (lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject_line text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_date timestamptz
);

CREATE TABLE IF NOT EXISTS todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  priority boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS todos_position_idx ON todos (position, created_at);

CREATE TABLE IF NOT EXISTS daily_sending_volume (
  log_date date PRIMARY KEY,
  total_volume integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_meeting_booked_events (
  lead_id uuid PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  booked_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_meeting_booked_events_booked_on_idx
  ON lead_meeting_booked_events (booked_on);

-- ---------------------------------------------------------------------------
-- RLS (open policies for demo — tighten before any real deployment)
-- ---------------------------------------------------------------------------

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sending_volume ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_meeting_booked_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on contacts" ON contacts;
CREATE POLICY "Allow all on contacts" ON contacts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on email_accounts" ON email_accounts;
CREATE POLICY "Allow all on email_accounts" ON email_accounts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on leads" ON leads;
CREATE POLICY "Allow all on leads" ON leads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on lead_activity" ON lead_activity;
CREATE POLICY "Allow all on lead_activity" ON lead_activity FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on templates" ON templates;
CREATE POLICY "Allow all on templates" ON templates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on todos" ON todos;
CREATE POLICY "Allow all on todos" ON todos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on daily_sending_volume" ON daily_sending_volume;
CREATE POLICY "Allow all on daily_sending_volume" ON daily_sending_volume FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on lead_meeting_booked_events" ON lead_meeting_booked_events;
CREATE POLICY "Allow all on lead_meeting_booked_events" ON lead_meeting_booked_events FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- RPC helpers (follow-up / no-show)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION log_followup(p_lead_id uuid)
RETURNS SETOF leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cadence integer;
BEGIN
  SELECT COALESCE(followup_cadence_days, 3) INTO v_cadence
  FROM leads WHERE id = p_lead_id;

  RETURN QUERY
  UPDATE leads SET
    last_followup_at = now(),
    next_followup_at = now() + (v_cadence || ' days')::interval,
    followup_count = followup_count + 1,
    awaiting_response_since = now(),
    updated_at = now()
  WHERE id = p_lead_id
  RETURNING *;

  INSERT INTO lead_activity (lead_id, activity_type, description)
  VALUES (p_lead_id, 'followup', 'Followed up');
END;
$$;

CREATE OR REPLACE FUNCTION log_noshow(p_lead_id uuid)
RETURNS SETOF leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE leads SET
    noshow_count = 1,
    next_followup_at = now() + interval '2 days',
    updated_at = now()
  WHERE id = p_lead_id
  RETURNING *;

  INSERT INTO lead_activity (lead_id, activity_type, description)
  VALUES (p_lead_id, 'noshow', 'No-show logged');
END;
$$;

GRANT EXECUTE ON FUNCTION log_followup(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_noshow(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket for transcript PDFs
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lead-transcripts',
  'lead-transcripts',
  false,
  52428800,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "lead_transcripts_select" ON storage.objects;
CREATE POLICY "lead_transcripts_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lead-transcripts');

DROP POLICY IF EXISTS "lead_transcripts_insert" ON storage.objects;
CREATE POLICY "lead_transcripts_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lead-transcripts');

DROP POLICY IF EXISTS "lead_transcripts_update" ON storage.objects;
CREATE POLICY "lead_transcripts_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'lead-transcripts');

DROP POLICY IF EXISTS "lead_transcripts_delete" ON storage.objects;
CREATE POLICY "lead_transcripts_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'lead-transcripts');

-- ---------------------------------------------------------------------------
-- Sample data (fictional — safe for public demos)
-- ---------------------------------------------------------------------------

INSERT INTO email_accounts (
  id, email_address, provider, purchase_date, monthly_cost, daily_volume,
  inbox_use, status, last_mailreach_score, last_mailreach_notes
) VALUES
  (
    'a1000001-0000-4000-8000-000000000001',
    'alex.demo@northwind-outreach.io',
    'Google Workspace',
    '2025-01-15',
    12.00,
    25,
    'personal',
    'active',
    92,
    'Inbox healthy — demo data only'
  ),
  (
    'a1000001-0000-4000-8000-000000000002',
    'campaigns@brightpath-demo.com',
    'Microsoft 365',
    '2025-02-01',
    10.00,
    40,
    'instantly',
    'warming',
    78,
    'Still warming — fictional account'
  ),
  (
    'a1000001-0000-4000-8000-000000000003',
    'outbound@harborline-demo.com',
    'Google Workspace',
    '2025-03-10',
    12.00,
    30,
    'smartlead',
    'active',
    88,
    'Demo smartlead inbox'
  );

INSERT INTO contacts (
  id, first_name, last_name, email, company, title, state, vertical,
  assignment, status, company_domain, phone, linkedin_url, sourced_date, last_contacted_date
) VALUES
  (
    'c1000001-0000-4000-8000-000000000001',
    'Morgan', 'Reed', 'morgan.reed@northwind-logistics.com',
    'Northwind Logistics', 'VP Operations', 'IL', 'Logistics',
    'personal', 'responded', 'northwind-logistics.com', '555-0101',
    'https://linkedin.com/in/demo-morgan-reed', now() - interval '21 days', now() - interval '2 days'
  ),
  (
    'c1000001-0000-4000-8000-000000000002',
    'Jordan', 'Blake', 'jordan.blake@brightpath-health.com',
    'Brightpath Health', 'Director of Growth', 'TX', 'Healthcare SaaS',
    'instantly', 'contacted', 'brightpath-health.com', '555-0102',
    'https://linkedin.com/in/demo-jordan-blake', now() - interval '18 days', now() - interval '5 days'
  ),
  (
    'c1000001-0000-4000-8000-000000000003',
    'Casey', 'Nguyen', 'casey.nguyen@harborline-finance.com',
    'Harborline Finance', 'Head of RevOps', 'CA', 'Fintech',
    'smartlead', 'qualified', 'harborline-finance.com', '555-0103',
    'https://linkedin.com/in/demo-casey-nguyen', now() - interval '30 days', now() - interval '1 day'
  ),
  (
    'c1000001-0000-4000-8000-000000000004',
    'Riley', 'Patel', 'riley.patel@summit-edu.org',
    'Summit Education Group', 'COO', 'NY', 'EdTech',
    'unassigned', 'sourced', 'summit-edu.org', '555-0104',
    'https://linkedin.com/in/demo-riley-patel', now() - interval '7 days', null
  ),
  (
    'c1000001-0000-4000-8000-000000000005',
    'Taylor', 'Kim', 'taylor.kim@atlas-manufacturing.com',
    'Atlas Manufacturing', 'Plant Manager', 'OH', 'Manufacturing',
    'personal', 'responded', 'atlas-manufacturing.com', '555-0105',
    'https://linkedin.com/in/demo-taylor-kim', now() - interval '45 days', now() - interval '3 days'
  ),
  (
    'c1000001-0000-4000-8000-000000000006',
    'Avery', 'Chen', 'avery.chen@lumen-retail.com',
    'Lumen Retail', 'CMO', 'FL', 'Retail',
    'instantly', 'disqualified', 'lumen-retail.com', '555-0106',
    'https://linkedin.com/in/demo-avery-chen', now() - interval '60 days', now() - interval '20 days'
  ),
  (
    'c1000001-0000-4000-8000-000000000007',
    'Quinn', 'Foster', 'quinn.foster@vertex-security.com',
    'Vertex Security', 'CEO', 'WA', 'Cybersecurity',
    'personal', 'responded', 'vertex-security.com', '555-0107',
    'https://linkedin.com/in/demo-quinn-foster', now() - interval '14 days', now() - interval '4 days'
  ),
  (
    'c1000001-0000-4000-8000-000000000008',
    'Sam', 'Okafor', 'sam.okafor@greenfield-energy.com',
    'Greenfield Energy', 'Director of Procurement', 'CO', 'Energy',
    'smartlead', 'contacted', 'greenfield-energy.com', '555-0108',
    'https://linkedin.com/in/demo-sam-okafor', now() - interval '10 days', now() - interval '6 days'
  );

INSERT INTO leads (
  id, contact_id, status, notes, followup_cadence_days, next_followup_at,
  followup_count, deal_value, personal_email_account_id, status_entered_at, proposal_made, post_meeting_email_sent
) VALUES
  (
    'l1000001-0000-4000-8000-000000000001',
    'c1000001-0000-4000-8000-000000000001',
    'meeting_booked',
    'Interested in workflow automation pilot for 3 warehouses.',
    3, now() + interval '2 days', 1, 48000,
    'a1000001-0000-4000-8000-000000000001',
    now() - interval '5 days', false, true
  ),
  (
    'l1000001-0000-4000-8000-000000000002',
    'c1000001-0000-4000-8000-000000000002',
    'meeting_requested',
    'Asked for case studies in HIPAA-compliant outreach.',
    4, now() + interval '1 day', 0, 32000,
    null, now() - interval '3 days', false, false
  ),
  (
    'l1000001-0000-4000-8000-000000000003',
    'c1000001-0000-4000-8000-000000000003',
    'proposal_sent',
    'Sent tiered pricing; decision expected end of month.',
    5, now() + interval '4 days', 2, 96000,
    'a1000001-0000-4000-8000-000000000003',
    now() - interval '12 days', true, true
  ),
  (
    'l1000001-0000-4000-8000-000000000004',
    'c1000001-0000-4000-8000-000000000005',
    '2nd_call_booked',
    'Technical stakeholder joining next call.',
    5, now() + interval '3 days', 1, 55000,
    'a1000001-0000-4000-8000-000000000001',
    now() - interval '8 days', false, true
  ),
  (
    'l1000001-0000-4000-8000-000000000005',
    'c1000001-0000-4000-8000-000000000007',
    'responded',
    'Replied positively to initial sequence.',
    3, now() + interval '2 days', 0, null,
    'a1000001-0000-4000-8000-000000000001',
    now() - interval '2 days', false, false
  ),
  (
    'l1000001-0000-4000-8000-000000000006',
    'c1000001-0000-4000-8000-000000000006',
    'closed',
    'Budget freeze — revisit Q3.',
    null, null, 3, 0,
    null, now() - interval '25 days', false, false
  );

UPDATE leads
SET closed_reason = 'lost', close_lost_reason = 'timing'
WHERE id = 'l1000001-0000-4000-8000-000000000006';

INSERT INTO lead_activity (lead_id, activity_type, description, created_at) VALUES
  ('l1000001-0000-4000-8000-000000000001', 'created', 'Added to pipeline', now() - interval '14 days'),
  ('l1000001-0000-4000-8000-000000000001', 'status', 'Moved from Responded to Meeting Booked', now() - interval '5 days'),
  ('l1000001-0000-4000-8000-000000000002', 'created', 'Added to pipeline', now() - interval '10 days'),
  ('l1000001-0000-4000-8000-000000000003', 'created', 'Added to pipeline', now() - interval '20 days'),
  ('l1000001-0000-4000-8000-000000000003', 'followup', 'Followed up', now() - interval '6 days'),
  ('l1000001-0000-4000-8000-000000000004', 'created', 'Added to pipeline', now() - interval '15 days'),
  ('l1000001-0000-4000-8000-000000000005', 'created', 'Added to pipeline', now() - interval '4 days'),
  ('l1000001-0000-4000-8000-000000000006', 'created', 'Added to pipeline', now() - interval '40 days');

INSERT INTO lead_meeting_booked_events (lead_id, booked_on) VALUES
  ('l1000001-0000-4000-8000-000000000001', (now() - interval '5 days')::date),
  ('l1000001-0000-4000-8000-000000000004', (now() - interval '8 days')::date);

INSERT INTO templates (id, name, subject_line, body) VALUES
  (
    't1000001-0000-4000-8000-000000000001',
    'Intro — ops leaders',
    'Quick idea for {{company}}',
    E'Hi {{first_name}},\n\nI noticed {{company}} is scaling regional operations. We help teams like yours cut manual follow-up work by ~30%.\n\nOpen to a 15-minute call next week?\n\n— Alex'
  ),
  (
    't1000001-0000-4000-8000-000000000002',
    'Follow-up — no reply',
    'Re: {{company}} outreach workflow',
    E'Hi {{first_name}},\n\nCircling back in case this got buried. Happy to share a one-page overview tailored to {{vertical}}.\n\nBest,\nAlex'
  );

INSERT INTO todos (text, done, priority, position) VALUES
  ('Prep demo deck for Northwind call', false, true, 0),
  ('Update Harborline proposal pricing table', false, true, 1),
  ('Review Instantly warmup scores', false, false, 2),
  ('Archive disqualified Lumen Retail contact', true, false, 3);

INSERT INTO daily_sending_volume (log_date, total_volume) VALUES
  ((now() - interval '2 days')::date, 85),
  ((now() - interval '1 day')::date, 92),
  (current_date, 95);

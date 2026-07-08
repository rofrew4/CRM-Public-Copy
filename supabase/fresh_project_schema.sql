-- Run this ONCE in a brand-new Supabase project (SQL Editor).
-- Schema only — no personal data. After this, run seed_demo.sql (optional).
--
-- This consolidates your production migration history into a single fresh setup.
-- Do NOT paste your old migration/backfill scripts on an empty project.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ CONTACTS ============
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name text,
  last_name text,
  email text UNIQUE NOT NULL,
  company text,
  company_domain text,
  title text,
  state text,
  phone text,
  linkedin_url text,
  vertical text,
  source text,
  assignment text NOT NULL DEFAULT 'unassigned'
    CHECK (assignment IN ('unassigned', 'instantly', 'smartlead', 'personal')),
  campaign_id text,
  status text NOT NULL DEFAULT 'sourced'
    CHECK (status IN ('sourced', 'contacted', 'responded', 'qualified', 'disqualified')),
  sourced_date timestamptz DEFAULT now(),
  last_contacted_date timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacts_email ON contacts (lower(email));
CREATE INDEX idx_contacts_company_domain ON contacts (company_domain);
CREATE INDEX idx_contacts_assignment ON contacts (assignment);
CREATE INDEX idx_contacts_status ON contacts (status);
CREATE INDEX idx_contacts_state ON contacts (state);
CREATE INDEX idx_contacts_vertical ON contacts (vertical);

-- ============ EMAIL ACCOUNTS ============
CREATE TABLE email_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_address text UNIQUE NOT NULL,
  domain text,
  provider text,
  purchase_date date,
  monthly_cost numeric(10, 2),
  daily_volume integer DEFAULT 0,
  inbox_use text NOT NULL DEFAULT 'personal'
    CHECK (inbox_use IN ('personal', 'instantly', 'smartlead')),
  status text NOT NULL DEFAULT 'warming'
    CHECK (status IN ('warming', 'active', 'paused', 'dead')),
  password text,
  mailreach_test_url text,
  last_mailreach_test_date timestamptz,
  last_mailreach_score numeric(5, 2),
  last_mailreach_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_accounts_status ON email_accounts (status);
CREATE INDEX idx_email_accounts_domain ON email_accounts (domain);

-- ============ TEMPLATES ============
CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  subject_line text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_date timestamptz
);

-- ============ OUTREACH LOG (legacy — app does not use, kept for parity) ============
CREATE TABLE outreach_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  template_id uuid REFERENCES templates(id) ON DELETE SET NULL,
  email_account_id uuid REFERENCES email_accounts(id) ON DELETE SET NULL,
  subject_sent text,
  body_sent text,
  sent_date timestamptz DEFAULT now()
);

CREATE INDEX idx_outreach_log_contact ON outreach_log (contact_id);
CREATE INDEX idx_outreach_log_template ON outreach_log (template_id);
CREATE INDEX idx_outreach_log_sent_date ON outreach_log (sent_date DESC);

-- ============ LEADS ============
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  closed_reason text CHECK (
    closed_reason IS NULL OR closed_reason IN ('won', 'lost', 'non_fit', 'ghosted')
  ),
  close_lost_reason text CHECK (
    close_lost_reason IS NULL OR close_lost_reason IN (
      'wrong_fit', 'no_budget', 'ghosted', 'went_with_competitor', 'timing', 'other'
    )
  ),
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
  deal_value numeric(12, 2),
  personal_email_account_id uuid REFERENCES email_accounts(id) ON DELETE SET NULL,
  status_entered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_status ON leads (status);
CREATE INDEX idx_leads_follow_up_date ON leads (follow_up_date);
CREATE INDEX idx_leads_updated_at ON leads (updated_at DESC);
CREATE INDEX idx_leads_personal_email_account_id ON leads (personal_email_account_id);
CREATE INDEX idx_leads_search ON leads USING gin (
  to_tsvector('english', coalesce(notes, '') || ' ' || coalesce(meeting_transcript, ''))
);

-- ============ LEAD ACTIVITY ============
CREATE TABLE lead_activity (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_activity_lead ON lead_activity (lead_id, created_at DESC);

-- ============ LEAD MEETING BOOKED EVENTS ============
CREATE TABLE lead_meeting_booked_events (
  lead_id uuid PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  booked_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lead_meeting_booked_events_booked_on_idx
  ON lead_meeting_booked_events (booked_on);

-- ============ TODOS ============
CREATE TABLE todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  priority boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX todos_position_idx ON todos (position, created_at);

-- ============ DAILY SENDING VOLUME ============
CREATE TABLE daily_sending_volume (
  log_date date PRIMARY KEY,
  total_volume integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER email_accounts_updated_at
  BEFORE UPDATE ON email_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION log_lead_status_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO lead_activity (lead_id, activity_type, description)
    VALUES (NEW.id, 'status_change', 'Status changed from ' || OLD.status || ' to ' || NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_log_status_change
  AFTER UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION log_lead_status_change();

-- ============ RPC HELPERS ============
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

-- ============ ROW LEVEL SECURITY ============
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_meeting_booked_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sending_volume ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_all_contacts" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_email_accounts" ON email_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_templates" ON templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_outreach_log" ON outreach_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_leads" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_lead_activity" ON lead_activity FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on lead_meeting_booked_events" ON lead_meeting_booked_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on todos" ON todos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on daily_sending_volume" ON daily_sending_volume FOR ALL USING (true) WITH CHECK (true);

-- ============ STORAGE (transcript PDFs) ============
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

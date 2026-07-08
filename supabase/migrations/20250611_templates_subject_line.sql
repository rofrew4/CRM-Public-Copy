-- Align templates table with Outreach page (subject_line + body).

CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject_line text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_date timestamptz
);

ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS subject_line text NOT NULL DEFAULT '';

ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS body text NOT NULL DEFAULT '';

ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS last_used_date timestamptz;

-- Legacy column name from early schema drafts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'templates'
      AND column_name = 'subject'
  ) THEN
    UPDATE templates
    SET subject_line = COALESCE(NULLIF(subject_line, ''), subject, '')
    WHERE subject_line IS NULL OR subject_line = '';
    ALTER TABLE templates DROP COLUMN subject;
  END IF;
END $$;

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on templates" ON templates;
CREATE POLICY "Allow all on templates"
  ON templates FOR ALL
  USING (true) WITH CHECK (true);

-- Store meeting transcript PDFs in Supabase Storage (path on lead row).
-- Run in Supabase SQL Editor.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS meeting_transcript_path text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lead-transcripts',
  'lead-transcripts',
  false,
  52428800,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "lead_transcripts_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lead-transcripts');

CREATE POLICY "lead_transcripts_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lead-transcripts');

CREATE POLICY "lead_transcripts_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'lead-transcripts');

CREATE POLICY "lead_transcripts_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'lead-transcripts');

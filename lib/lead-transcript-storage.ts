import { supabase } from "@/lib/supabase";

export const LEAD_TRANSCRIPT_BUCKET = "lead-transcripts";

export function leadTranscriptStoragePath(leadId: string): string {
  return `${leadId}/transcript.pdf`;
}

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

export async function uploadLeadTranscriptPdf(
  leadId: string,
  file: File
): Promise<string> {
  if (!isPdfFile(file)) {
    throw new Error("Please use a PDF file.");
  }

  const path = leadTranscriptStoragePath(leadId);
  const { error } = await supabase.storage
    .from(LEAD_TRANSCRIPT_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: "application/pdf",
    });

  if (error) throw new Error(error.message);
  return path;
}

export async function getLeadTranscriptPdfUrl(
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(LEAD_TRANSCRIPT_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Could not open PDF.");
  }
  return data.signedUrl;
}

export async function removeLeadTranscriptPdf(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(LEAD_TRANSCRIPT_BUCKET)
    .remove([path]);
  if (error) throw new Error(error.message);
}

export async function downloadLeadTranscriptPdf(leadId: string): Promise<Buffer> {
  const path = leadTranscriptStoragePath(leadId);
  const { data, error } = await supabase.storage
    .from(LEAD_TRANSCRIPT_BUCKET)
    .download(path);

  if (error || !data) {
    throw new Error(error?.message ?? "Could not download transcript PDF.");
  }

  return Buffer.from(await data.arrayBuffer());
}

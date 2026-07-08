import { NextResponse } from "next/server";
import { summarizeMeetingNote } from "@/lib/lead-note-summary";
import { extractTextFromPdfBuffer } from "@/lib/pdf-text-server";
import { downloadLeadTranscriptPdf } from "@/lib/lead-transcript-storage";
import { supabase } from "@/lib/supabase";
import type { Contact } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { leadId?: string };
    const leadId = body.leadId;

    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json({ error: "leadId is required." }, { status: 400 });
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, meeting_transcript_path, contact:contacts(*)")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    if (!lead.meeting_transcript_path) {
      return NextResponse.json(
        { error: "No transcript PDF attached to this lead." },
        { status: 400 }
      );
    }

    const contact = lead.contact as unknown as Contact | null;
    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found for this lead." },
        { status: 404 }
      );
    }

    const pdfBuffer = await downloadLeadTranscriptPdf(leadId);
    const transcriptText = await extractTextFromPdfBuffer(pdfBuffer);
    const note = await summarizeMeetingNote(contact, transcriptText);

    return NextResponse.json({ note });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to summarize transcript.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

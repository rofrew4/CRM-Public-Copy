import "server-only";

import OpenAI from "openai";
import { getOpenAIApiKey } from "@/lib/openai-api-key";
import type { Contact } from "@/lib/types";
import { contactDisplayName } from "@/lib/utils";

const MAX_TRANSCRIPT_CHARS = 12_000;

function buildContactContext(contact: Contact): string {
  const parts = [
    `Name: ${contactDisplayName(contact)}`,
    contact.state ? `State/region: ${contact.state}` : null,
    contact.company ? `Company: ${contact.company}` : null,
    contact.title ? `Title: ${contact.title}` : null,
    contact.email ? `Email: ${contact.email}` : null,
  ].filter(Boolean);
  return parts.join("\n");
}

export async function summarizeMeetingNote(
  contact: Contact,
  transcriptText: string
): Promise<string> {
  const apiKey = getOpenAIApiKey();

  const truncated = transcriptText.slice(0, MAX_TRANSCRIPT_CHARS);
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content: `You write concise CRM meeting notes from sales call transcripts.

Output exactly 3 bullet lines using "-" prefixes and these labels (keep the labels):
- Business / industry: [type of business, vertical, or role — infer from transcript and contact context]
- Use case: [Yes — they want something built, OR No — not a fit]
- Build or why not: [If use case is Yes, what to build in plain language; if No, brief reason — budget, timing, wrong fit, no custom build need, etc.]

Rules:
- Be factual; only use the transcript and contact info.
- If unknown, write "Unclear from transcript" for that bullet.
- No extra bullets, paragraphs, quotes, or preamble.`,
      },
      {
        role: "user",
        content: `Contact:\n${buildContactContext(contact)}\n\nMeeting transcript:\n${truncated}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("No summary returned from OpenAI.");
  }

  return raw;
}

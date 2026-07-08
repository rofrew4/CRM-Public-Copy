import {
  contactMatchesSearch,
  contactSearchDbTerms,
  contactSearchScore,
} from "@/lib/contact-search";
import { contactDisplayName } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { Contact } from "@/lib/types";
import { normalizeEmail } from "@/lib/utils";

const PAGE_SIZE = 1000;
const BATCH = 100;

/** Supabase/PostgREST caps at 1000 rows per request — paginate to load all. */
export async function fetchAllContacts(): Promise<Contact[]> {
  const all: Contact[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!data?.length) break;

    all.push(...(data as Contact[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

const SEARCH_COLUMNS = [
  "first_name",
  "last_name",
  "email",
  "company",
  "title",
  "phone",
] as const;

function escapeIlikeValue(term: string): string {
  return term
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

function ilikeOrFilter(term: string): string {
  const pattern = `"%${escapeIlikeValue(term)}%"`;
  return SEARCH_COLUMNS.map((col) => `${col}.ilike.${pattern}`).join(",");
}

/** Server-side contact lookup — complements in-memory search for large lists. */
export async function searchContacts(query: string): Promise<Contact[]> {
  const terms = contactSearchDbTerms(query);
  if (terms.length === 0) return [];

  const byId = new Map<string, Contact>();

  for (const term of terms) {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .or(ilikeOrFilter(term))
      .limit(500);

    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      byId.set(row.id, row as Contact);
    }
  }

  const matches = [...byId.values()].filter((c) => contactMatchesSearch(c, query));
  return matches.sort((a, b) => {
    const byScore = contactSearchScore(b, query) - contactSearchScore(a, query);
    if (byScore !== 0) return byScore;
    return contactDisplayName(a).localeCompare(contactDisplayName(b));
  });
}

async function deleteLeadChunk(leadIds: string[]): Promise<string | null> {
  if (leadIds.length === 0) return null;

  for (let i = 0; i < leadIds.length; i += BATCH) {
    const chunk = leadIds.slice(i, i + BATCH);

    const { error: activityError } = await supabase
      .from("lead_activity")
      .delete()
      .in("lead_id", chunk);
    if (activityError) return activityError.message;

    const { error: leadsError } = await supabase
      .from("leads")
      .delete()
      .in("id", chunk);
    if (leadsError) return leadsError.message;
  }

  return null;
}

export async function deleteContacts(ids: string[]): Promise<string | null> {
  if (ids.length === 0) return null;

  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);

    const { data: leads, error: leadsFetchError } = await supabase
      .from("leads")
      .select("id")
      .in("contact_id", chunk);
    if (leadsFetchError) return leadsFetchError.message;

    const leadIds = (leads ?? []).map((l) => l.id);
    const leadErr = await deleteLeadChunk(leadIds);
    if (leadErr) return leadErr;

    const { error } = await supabase.from("contacts").delete().in("id", chunk);
    if (error) return error.message;
  }

  return null;
}

export async function updateContactsBatch(
  ids: string[],
  fields: Record<string, unknown>
): Promise<string | null> {
  if (ids.length === 0) return null;

  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const { error } = await supabase
      .from("contacts")
      .update(fields)
      .in("id", chunk);
    if (error) return error.message;
  }

  return null;
}

export async function insertContactsBatch(
  rows: Record<string, unknown>[]
): Promise<string | null> {
  const INSERT_BATCH = 500;
  const normalized = rows.map((row) => {
    const email = row.email;
    if (typeof email === "string") {
      return { ...row, email: normalizeEmail(email) };
    }
    return row;
  });

  for (let i = 0; i < normalized.length; i += INSERT_BATCH) {
    const chunk = normalized.slice(i, i + INSERT_BATCH);
    const { error } = await supabase.from("contacts").insert(chunk);
    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        return `${error.message} — try searching Contacts by email; duplicates may already exist under a different name.`;
      }
      return error.message;
    }
  }
  return null;
}

/** Lightweight fetch for import duplicate detection (always hits DB). */
export async function fetchContactEmailIndex(): Promise<
  Map<string, Pick<Contact, "id" | "email" | "first_name" | "last_name">>
> {
  const index = new Map<
    string,
    Pick<Contact, "id" | "email" | "first_name" | "last_name">
  >();
  const PAGE = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("contacts")
      .select("id, email, first_name, last_name")
      .range(from, from + PAGE - 1);

    if (error) throw new Error(error.message);
    if (!data?.length) break;

    for (const row of data) {
      const c = row as Pick<Contact, "id" | "email" | "first_name" | "last_name">;
      index.set(normalizeEmail(c.email), c);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return index;
}

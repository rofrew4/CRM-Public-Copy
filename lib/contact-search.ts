import type { Contact } from "@/lib/types";
import { contactDisplayName, normalizeEmail } from "@/lib/utils";

/** Lowercase, strip accents, collapse whitespace. */
export function foldSearchText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip punctuation for loose matching; keep @ . + _ - in emails. */
function foldLoose(s: string, keepEmailChars = false): string {
  const folded = foldSearchText(s);
  if (keepEmailChars) {
    return folded.replace(/[^a-z0-9@.+_-]/g, "");
  }
  return folded.replace(/[^a-z0-9]/g, "");
}

function searchTokens(query: string): string[] {
  return foldSearchText(query)
    .split(/[\s,]+/)
    .filter((t) => t.length > 0);
}

type SearchField = {
  value: string;
  kind: "name" | "email" | "company" | "other";
};

function contactSearchFields(c: Contact): SearchField[] {
  const first = foldSearchText(c.first_name ?? "");
  const last = foldSearchText(c.last_name ?? "");
  const display = foldSearchText(contactDisplayName(c));
  const rawEmail = (c.email ?? "").trim();
  const email = normalizeEmail(rawEmail);
  const local = email.split("@")[0] ?? "";
  const domain = email.split("@")[1] ?? "";
  const company = foldSearchText(c.company ?? "");

  const fields = [
    { value: display, kind: "name" as const },
    { value: [first, last].filter(Boolean).join(" "), kind: "name" as const },
    { value: [last, first].filter(Boolean).join(" "), kind: "name" as const },
    { value: [last, first].filter(Boolean).join(", "), kind: "name" as const },
    { value: rawEmail, kind: "email" as const },
    { value: email, kind: "email" as const },
    { value: local, kind: "email" as const },
    { value: local.replace(/\./g, ""), kind: "email" as const },
    { value: domain, kind: "email" as const },
    { value: company, kind: "company" as const },
    { value: foldSearchText(c.title ?? ""), kind: "other" as const },
    { value: foldSearchText(c.phone ?? ""), kind: "other" as const },
    { value: (c.phone ?? "").replace(/\D/g, ""), kind: "other" as const },
    { value: foldSearchText(c.state ?? ""), kind: "other" as const },
    { value: foldSearchText(c.vertical ?? ""), kind: "other" as const },
  ].filter((f) => f.value.length > 0) satisfies SearchField[];

  return fields;
}

function fieldVariants(field: SearchField): string[] {
  const strict = field.value;
  const loose = foldLoose(strict, field.kind === "email");
  return strict === loose ? [strict] : [strict, loose];
}

function tokenMatchesField(field: SearchField, token: string): boolean {
  const foldedToken = foldSearchText(token);
  if (!foldedToken) return true;

  const looseToken = foldLoose(foldedToken, field.kind === "email");
  const primary =
    field.kind === "name" || field.kind === "email" || field.kind === "company";

  for (const variant of fieldVariants(field)) {
    const looseVariant = foldLoose(variant, field.kind === "email");

    if (foldedToken.length === 1) {
      if (!primary) continue;
      if (variant.startsWith(foldedToken) || looseVariant.startsWith(looseToken)) {
        return true;
      }
      continue;
    }

    if (foldedToken.length === 2) {
      if (!primary) continue;
      if (
        variant.startsWith(foldedToken) ||
        looseVariant.startsWith(looseToken) ||
        variant.includes(` ${foldedToken}`) ||
        variant.includes(`-${foldedToken}`)
      ) {
        return true;
      }
      continue;
    }

    if (variant.includes(foldedToken)) return true;
    if (looseToken.length >= 3 && looseVariant.includes(looseToken)) return true;
  }

  return false;
}

function tokenMatchesContact(fields: SearchField[], token: string): boolean {
  return fields.some((field) => tokenMatchesField(field, token));
}

function phraseMatchesContact(fields: SearchField[], query: string): boolean {
  const q = foldSearchText(query);
  if (!q) return true;

  const looseQ = foldLoose(q, q.includes("@"));

  for (const field of fields) {
    for (const variant of fieldVariants(field)) {
      const looseVariant = foldLoose(variant, field.kind === "email");

      if (q.length === 1) {
        if (field.kind !== "name" && field.kind !== "email" && field.kind !== "company") {
          continue;
        }
        if (variant.startsWith(q) || looseVariant.startsWith(looseQ)) return true;
        continue;
      }

      if (q.length === 2) {
        if (field.kind !== "name" && field.kind !== "email" && field.kind !== "company") {
          continue;
        }
        if (
          variant.startsWith(q) ||
          looseVariant.startsWith(looseQ) ||
          variant.includes(` ${q}`) ||
          variant.includes(`-${q}`)
        ) {
          return true;
        }
        continue;
      }

      if (variant.includes(q)) return true;
      if (looseQ.length >= 3 && looseVariant.includes(looseQ)) return true;
    }
  }

  return false;
}

/** Phrase + token match across name, email, company, etc. */
export function contactMatchesSearch(c: Contact, query: string): boolean {
  const q = foldSearchText(query);
  if (!q) return true;

  const fields = contactSearchFields(c);
  if (phraseMatchesContact(fields, q)) return true;

  const tokens = searchTokens(q);
  if (tokens.length === 0) return true;
  if (tokens.length === 1) return tokenMatchesContact(fields, tokens[0]!);

  return tokens.every((token) => tokenMatchesContact(fields, token));
}

function fieldSearchScore(field: SearchField, query: string): number {
  const q = foldSearchText(query);
  if (!q) return 0;

  let best = 0;
  const looseQ = foldLoose(q, field.kind === "email");

  for (const variant of fieldVariants(field)) {
    const looseVariant = foldLoose(variant, field.kind === "email");
    let score = 0;

    if (variant === q) score = 100;
    else if (variant.startsWith(q)) score = 80;
    else if (variant.includes(q)) score = 50;
    else if (looseQ.length >= 3 && looseVariant.includes(looseQ)) score = 40;

    if (field.kind === "company" && score > 0) score += 5;
    best = Math.max(best, score);
  }

  return best;
}

/** Higher = better match for sorting search results. */
export function contactSearchScore(c: Contact, query: string): number {
  const q = foldSearchText(query);
  if (!q) return 0;

  const fields = contactSearchFields(c);
  let score = fieldSearchScore(
    { value: foldSearchText(contactDisplayName(c)), kind: "name" },
    q
  );
  score = Math.max(
    score,
    fieldSearchScore({ value: foldSearchText(c.email ?? ""), kind: "email" }, q)
  );
  score = Math.max(
    score,
    fieldSearchScore({ value: foldSearchText(c.company ?? ""), kind: "company" }, q)
  );

  for (const field of fields) {
    score = Math.max(score, fieldSearchScore(field, q));
  }

  const tokens = searchTokens(q);
  if (tokens.length > 1) {
    const display = foldSearchText(contactDisplayName(c));
    const company = foldSearchText(c.company ?? "");
    if (tokens.every((t) => display.includes(t))) score += 30;
    if (tokens.every((t) => company.includes(t))) score += 20;
  }

  return score;
}

export function sortContactsForSearch(
  contacts: Contact[],
  query: string
): Contact[] {
  const q = query.trim();
  if (!q) {
    return [...contacts].sort((a, b) =>
      contactDisplayName(a).localeCompare(contactDisplayName(b))
    );
  }

  return [...contacts]
    .filter((c) => contactMatchesSearch(c, q))
    .sort((a, b) => {
      const byScore = contactSearchScore(b, q) - contactSearchScore(a, q);
      if (byScore !== 0) return byScore;
      return contactDisplayName(a).localeCompare(contactDisplayName(b));
    });
}

/** Split a user query into terms suitable for database ilike search. */
export function contactSearchDbTerms(query: string): string[] {
  const q = query.trim();
  if (!q) return [];

  const folded = foldSearchText(q);
  const tokens = searchTokens(folded).filter((t) => t.length >= 3);
  return [...new Set([folded, ...tokens])];
}

/** Match a free-text label (e.g. SearchableSelect options) against a query. */
export function textMatchesSearch(text: string, query: string): boolean {
  const q = foldSearchText(query);
  if (!q) return true;

  const folded = foldSearchText(text);
  const looseQ = foldLoose(q, q.includes("@"));

  if (q.length === 1) return folded.startsWith(q);
  if (q.length === 2) {
    return (
      folded.startsWith(q) ||
      folded.includes(` ${q}`) ||
      folded.includes(`-${q}`)
    );
  }

  if (folded.includes(q)) return true;
  return looseQ.length >= 3 && foldLoose(folded).includes(looseQ);
}

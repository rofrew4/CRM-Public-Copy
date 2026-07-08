export const CSV_CONTACT_FIELDS = [
  { key: "email", label: "Email", required: true },
  { key: "first_name", label: "First Name", required: false },
  { key: "last_name", label: "Last Name", required: false },
  { key: "company", label: "Company", required: false },
  { key: "title", label: "Title", required: false },
  { key: "state", label: "State", required: false },
  { key: "vertical", label: "Vertical / Campaign", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "linkedin_url", label: "LinkedIn URL", required: false },
] as const;

export type CsvContactField = (typeof CSV_CONTACT_FIELDS)[number]["key"];

export type CsvColumnMapping = Record<CsvContactField, string>;

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^\w]/g, "");
}

/** Normalize for duplicate checks and storage. */
export function normalizeEmail(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/^mailto:/i, "")
    .replace(/\s+/g, "");
}

const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
]);

export function isGenericEmailDomain(domain: string): boolean {
  return GENERIC_EMAIL_DOMAINS.has(domain.toLowerCase());
}

const HEADER_ALIASES: Record<CsvContactField, string[]> = {
  email: ["email", "email_address", "e_mail", "e-mail", "work_email", "lead_email"],
  first_name: [
    "first_name",
    "firstname",
    "first",
    "fname",
    "given_name",
    "lead_first_name",
  ],
  last_name: [
    "last_name",
    "lastname",
    "last",
    "lname",
    "surname",
    "family_name",
    "lead_last_name",
  ],
  company: ["company", "company_name", "organization", "org", "account", "account_name"],
  title: ["title", "job_title", "position", "role"],
  state: ["state", "region", "location", "geo", "territory", "us_state"],
  vertical: ["vertical", "industry", "campaign", "campaign_name", "segment", "niche"],
  phone: ["phone", "phone_number", "mobile", "cell"],
  linkedin_url: [
    "linkedin_url",
    "linkedin",
    "linkedin_profile",
    "linkedin_profile_url",
    "person_linkedin_url",
  ],
};

export function guessColumnMapping(headers: string[]): CsvColumnMapping {
  const normalizedHeaders = headers.map((h) => ({
    raw: h,
    norm: normalizeHeader(h),
  }));

  const mapping = {} as CsvColumnMapping;
  for (const field of CSV_CONTACT_FIELDS) {
    mapping[field.key] = "";
    const aliases = HEADER_ALIASES[field.key];

    for (const { raw, norm } of normalizedHeaders) {
      if (aliases.includes(norm)) {
        mapping[field.key] = raw;
        break;
      }
      if (field.key === "first_name" && (norm.includes("first") && norm.includes("name"))) {
        mapping[field.key] = raw;
        break;
      }
      if (field.key === "last_name" && (norm.includes("last") && norm.includes("name"))) {
        mapping[field.key] = raw;
        break;
      }
      if (field.key === "email" && norm.includes("email")) {
        mapping[field.key] = raw;
        break;
      }
    }
  }

  // Combined "name" / "full_name" → leave first/last for manual map unless split possible
  const nameCol = normalizedHeaders.find(
    (h) =>
      h.norm === "name" ||
      h.norm === "full_name" ||
      h.norm === "lead_name" ||
      h.norm === "contact_name"
  );
  if (nameCol && !mapping.first_name) {
    mapping.first_name = nameCol.raw;
  }

  return mapping;
}

export function getMappedValue(
  row: Record<string, string>,
  mapping: CsvColumnMapping,
  field: CsvContactField
): string {
  const col = mapping[field];
  if (!col) return "";
  const val = row[col];
  return val?.trim() ?? "";
}

/** Split "John Smith" when only a full-name column is mapped to first_name. */
export function splitNameParts(
  first: string,
  last: string,
  fullNameFallback: string
): { first_name: string; last_name: string } {
  if (first && last) return { first_name: first, last_name: last };
  if (first && !last && first.includes(" ")) {
    const parts = first.trim().split(/\s+/);
    return {
      first_name: parts[0] ?? "",
      last_name: parts.slice(1).join(" "),
    };
  }
  if (!first && !last && fullNameFallback) {
    const parts = fullNameFallback.trim().split(/\s+/);
    return {
      first_name: parts[0] ?? "",
      last_name: parts.slice(1).join(" "),
    };
  }
  return { first_name: first, last_name: last };
}

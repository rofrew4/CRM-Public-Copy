import type { Contact } from "@/lib/types";

export const CONTACT_CLIPBOARD_COLUMNS = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "company", label: "Company" },
  { key: "title", label: "Title" },
  { key: "state", label: "State" },
  { key: "vertical", label: "Vertical" },
  { key: "assignment", label: "Assignment" },
  { key: "status", label: "Status" },
  { key: "sourced_date", label: "Sourced Date" },
  { key: "last_contacted_date", label: "Last Contacted" },
  { key: "phone", label: "Phone" },
  { key: "linkedin_url", label: "LinkedIn URL" },
] as const;

type ClipboardKey = (typeof CONTACT_CLIPBOARD_COLUMNS)[number]["key"];

function escapeTsvCell(value: string): string {
  if (/[\t\n\r"]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function dateForClipboard(date: string | null): string {
  if (!date) return "";
  return date.slice(0, 10);
}

function contactCellValue(c: Contact, key: ClipboardKey): string {
  switch (key) {
    case "sourced_date":
      return dateForClipboard(c.sourced_date);
    case "last_contacted_date":
      return dateForClipboard(c.last_contacted_date);
    default:
      return (c[key] as string | null) ?? "";
  }
}

/** Tab-separated rows with a header row, suitable for pasting into spreadsheets. */
export function contactsToTsv(contacts: Contact[]): string {
  const header = CONTACT_CLIPBOARD_COLUMNS.map((col) => col.label).join("\t");
  const rows = contacts.map((c) =>
    CONTACT_CLIPBOARD_COLUMNS.map((col) =>
      escapeTsvCell(contactCellValue(c, col.key))
    ).join("\t")
  );
  return [header, ...rows].join("\n");
}

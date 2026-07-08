"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import { Upload } from "lucide-react";
import type { Contact, ContactAssignment, ContactStatus } from "@/lib/types";
import { CONTACT_ASSIGNMENTS } from "@/lib/types";
import { contactDisplayName } from "@/lib/utils";
import { fetchContactEmailIndex, insertContactsBatch } from "@/lib/contacts-api";
import {
  CSV_CONTACT_FIELDS,
  type CsvColumnMapping,
  type CsvContactField,
  getMappedValue,
  guessColumnMapping,
  isGenericEmailDomain,
  normalizeEmail,
  splitNameParts,
} from "@/lib/csv-import";
import { getEmailDomain } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const inputClass =
  "w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400";

type Step = "upload" | "map" | "preview";

type SkippedDuplicate = {
  email: string;
  reason: "database" | "csv";
  existingName?: string;
};

type PreviewStats = {
  newRows: Record<string, string>[];
  emailDuplicates: number;
  csvDuplicates: number;
  companyDuplicates: number;
  skippedNoEmail: number;
  skippedSamples: SkippedDuplicate[];
};

interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function CsvImportModal({
  open,
  onClose,
  onImported,
}: CsvImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<CsvColumnMapping>(() =>
    guessColumnMapping([])
  );
  const [preview, setPreview] = useState<PreviewStats | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [importAssignment, setImportAssignment] =
    useState<ContactAssignment>("unassigned");
  const [importStatus, setImportStatus] = useState<ContactStatus>("sourced");
  const [importState, setImportState] = useState("");
  const [importVertical, setImportVertical] = useState("");

  const reset = () => {
    setStep("upload");
    setHeaders([]);
    setRawRows([]);
    setMapping(guessColumnMapping([]));
    setPreview(null);
    setError(null);
    setImportAssignment("unassigned");
    setImportStatus("sourced");
    setImportState("");
    setImportVertical("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const parseFile = (file: File) => {
    setError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().replace(/^\ufeff/, ""),
      complete: (results) => {
        if (!results.meta.fields?.length) {
          setError("Could not read CSV headers.");
          return;
        }
        const cols = results.meta.fields.filter(Boolean);
        setHeaders(cols);
        setRawRows(results.data);
        setMapping(guessColumnMapping(cols));
        setStep("map");
      },
      error: (err) => setError(err.message),
    });
  };

  const buildPreview = async () => {
    if (!mapping.email) {
      setError("Map the Email column before continuing.");
      return;
    }
    setError(null);
    setPreviewLoading(true);

    try {
      const existingByEmail = await fetchContactEmailIndex();
      const existingDomains = new Set<string>();
      for (const c of existingByEmail.values()) {
        const domain = getEmailDomain(c.email);
        if (domain && !isGenericEmailDomain(domain)) {
          existingDomains.add(domain);
        }
      }

      const seenInImport = new Set<string>();
      const newRows: Record<string, string>[] = [];
      let emailDuplicates = 0;
      let csvDuplicates = 0;
      let companyDuplicates = 0;
      let skippedNoEmail = 0;
      const skippedSamples: SkippedDuplicate[] = [];

      for (const row of rawRows) {
        const rawEmail = getMappedValue(row, mapping, "email");
        if (!rawEmail) {
          skippedNoEmail++;
          continue;
        }
        const email = normalizeEmail(rawEmail);
        if (!email.includes("@")) {
          skippedNoEmail++;
          continue;
        }

        const existing = existingByEmail.get(email);
        if (existing) {
          emailDuplicates++;
          if (skippedSamples.length < 25) {
            skippedSamples.push({
              email,
              reason: "database",
              existingName: contactDisplayName(existing as Contact),
            });
          }
          continue;
        }

        if (seenInImport.has(email)) {
          csvDuplicates++;
          if (skippedSamples.length < 25) {
            skippedSamples.push({ email, reason: "csv" });
          }
          continue;
        }

        const domain = getEmailDomain(email);
        if (domain && !isGenericEmailDomain(domain) && existingDomains.has(domain)) {
          companyDuplicates++;
        }

        newRows.push(row);
        seenInImport.add(email);
        if (domain && !isGenericEmailDomain(domain)) {
          existingDomains.add(domain);
        }
      }

      setPreview({
        newRows,
        emailDuplicates,
        csvDuplicates,
        companyDuplicates,
        skippedNoEmail,
        skippedSamples,
      });
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to check duplicates");
    } finally {
      setPreviewLoading(false);
    }
  };

  const sampleRows = useMemo(() => {
    if (!preview) return [];
    return preview.newRows.slice(0, 5).map((row) => {
      const email = normalizeEmail(getMappedValue(row, mapping, "email"));
      const { first_name, last_name } = splitNameParts(
        getMappedValue(row, mapping, "first_name"),
        getMappedValue(row, mapping, "last_name"),
        getMappedValue(row, mapping, "first_name")
      );
      return {
        first_name,
        last_name,
        email,
        company: getMappedValue(row, mapping, "company"),
        state:
          getMappedValue(row, mapping, "state") || importState || "—",
        vertical:
          getMappedValue(row, mapping, "vertical") || importVertical || "—",
        assignment: importAssignment,
      };
    });
  }, [preview, mapping, importState, importVertical, importAssignment]);

  const runImport = async () => {
    if (!preview?.newRows.length) return;
    setImporting(true);
    setError(null);
    const now = new Date().toISOString();

    const rows = preview.newRows.map((row) => {
      const email = normalizeEmail(getMappedValue(row, mapping, "email"));
      const { first_name, last_name } = splitNameParts(
        getMappedValue(row, mapping, "first_name"),
        getMappedValue(row, mapping, "last_name"),
        getMappedValue(row, mapping, "first_name")
      );
      const rowState = getMappedValue(row, mapping, "state") || importState || null;
      const rowVertical =
        getMappedValue(row, mapping, "vertical") || importVertical || null;

      return {
        first_name: first_name || null,
        last_name: last_name || null,
        email,
        company: getMappedValue(row, mapping, "company") || null,
        title: getMappedValue(row, mapping, "title") || null,
        state: rowState,
        vertical: rowVertical,
        phone: getMappedValue(row, mapping, "phone") || null,
        linkedin_url: getMappedValue(row, mapping, "linkedin_url") || null,
        company_domain: getEmailDomain(email),
        assignment: importAssignment,
        status: importStatus,
        sourced_date: now,
      };
    });

    const err = await insertContactsBatch(rows);
    setImporting(false);
    if (err) {
      setError(err);
      return;
    }
    handleClose();
    onImported();
  };

  const setMapField = (field: CsvContactField, column: string) => {
    setMapping((m) => ({ ...m, [field]: column }));
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import CSV" wide>
      {error ? (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {step === "upload" ? (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 px-6 py-12 hover:border-gray-300">
          <Upload className="mb-2 h-8 w-8 text-gray-400" />
          <span className="text-sm text-gray-600">
            Drop a CSV file or click to browse
          </span>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) parseFile(file);
            }}
          />
        </label>
      ) : null}

      {step === "map" ? (
        <section className="space-y-5">
          <p className="text-sm text-gray-600">
            Verify column mapping ({rawRows.length} rows). List defaults apply
            when a CSV cell is empty.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {CSV_CONTACT_FIELDS.map(({ key, label, required }) => (
              <label key={key} className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">
                  {label}
                  {required ? " *" : ""}
                </span>
                <select
                  className={inputClass}
                  value={mapping[key]}
                  onChange={(e) => setMapField(key, e.target.value)}
                >
                  <option value="">— Skip —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <fieldset className="space-y-3 rounded-lg border border-gray-100 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              List defaults
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">
                  Campaign / Assignment
                </span>
                <select
                  className={inputClass}
                  value={importAssignment}
                  onChange={(e) =>
                    setImportAssignment(e.target.value as ContactAssignment)
                  }
                >
                  {CONTACT_ASSIGNMENTS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">
                  Status
                </span>
                <select
                  className={inputClass}
                  value={importStatus}
                  onChange={(e) =>
                    setImportStatus(e.target.value as ContactStatus)
                  }
                >
                  <option value="sourced">sourced</option>
                  <option value="contacted">contacted</option>
                  <option value="responded">responded</option>
                  <option value="qualified">qualified</option>
                  <option value="disqualified">disqualified</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">
                  State (default)
                </span>
                <input
                  className={inputClass}
                  placeholder="e.g. CA, TX"
                  value={importState}
                  onChange={(e) => setImportState(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">
                  Vertical / Campaign tag
                </span>
                <input
                  className={inputClass}
                  placeholder="e.g. SaaS, Healthcare"
                  value={importVertical}
                  onChange={(e) => setImportVertical(e.target.value)}
                />
              </label>
            </div>
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStep("upload")}>
              Back
            </Button>
            <Button onClick={() => void buildPreview()} disabled={previewLoading}>
              {previewLoading ? "Checking…" : "Review import"}
            </Button>
          </div>
        </section>
      ) : null}

      {step === "preview" && preview ? (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-2xl font-semibold text-green-700">
                {preview.newRows.length}
              </p>
              <p className="text-xs text-green-600">New contacts</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-2xl font-semibold text-gray-700">
                {preview.emailDuplicates}
              </p>
              <p className="text-xs text-gray-600">Already in CRM (by email)</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-4">
              <p className="text-2xl font-semibold text-amber-700">
                {preview.csvDuplicates}
              </p>
              <p className="text-xs text-amber-600">Duplicate rows in file</p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4">
              <p className="text-2xl font-semibold text-yellow-700">
                {preview.skippedNoEmail}
              </p>
              <p className="text-xs text-yellow-600">Missing / invalid email</p>
            </div>
          </div>

          {preview.emailDuplicates > 0 ? (
            <p className="text-sm text-gray-600">
              Skipped rows already exist in your database (matched by email, not
              name). Search Contacts using their{" "}
              <strong>email address</strong> — the name in the CRM may differ
              from your file.
            </p>
          ) : null}

          {preview.skippedSamples.length > 0 ? (
            <details className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              <summary className="cursor-pointer font-medium text-gray-700">
                View skipped emails (
                {preview.emailDuplicates + preview.csvDuplicates})
              </summary>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-gray-600">
                {preview.skippedSamples.map((s) => (
                  <li key={`${s.reason}-${s.email}`}>
                    <span className="font-mono text-gray-800">{s.email}</span>
                    {s.reason === "database" ? (
                      <span>
                        {" "}
                        — in CRM as{" "}
                        <span className="text-gray-900">
                          {s.existingName || "unknown"}
                        </span>
                      </span>
                    ) : (
                      <span> — duplicate row in CSV</span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {preview.companyDuplicates > 0 ? (
            <p className="text-xs text-gray-500">
              {preview.companyDuplicates} new row(s) share a company domain with
              an existing contact (informational — still imported).
            </p>
          ) : null}

          {sampleRows.length > 0 ? (
            <div className="overflow-x-auto">
              <p className="mb-2 text-xs font-medium text-gray-500">
                Preview (first {sampleRows.length} rows)
              </p>
              <div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="py-1.5 pr-2">First</th>
                      <th className="py-1.5 pr-2">Last</th>
                      <th className="py-1.5 pr-2">Email</th>
                      <th className="py-1.5 pr-2">Company</th>
                      <th className="py-1.5 pr-2">State</th>
                      <th className="py-1.5">Assignment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleRows.map((r, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-1.5 pr-2">{r.first_name || "—"}</td>
                        <td className="py-1.5 pr-2">{r.last_name || "—"}</td>
                        <td className="py-1.5 pr-2 text-gray-600">{r.email}</td>
                        <td className="py-1.5 pr-2">{r.company || "—"}</td>
                        <td className="py-1.5 pr-2">{r.state}</td>
                        <td className="py-1.5">{r.assignment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStep("map")}>
              Back
            </Button>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={runImport}
              disabled={importing || preview.newRows.length === 0}
            >
              {importing
                ? "Importing…"
                : `Import ${preview.newRows.length} contacts`}
            </Button>
          </div>
        </section>
      ) : null}
    </Modal>
  );
}

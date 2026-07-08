"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Contact, ContactAssignment, ContactStatus } from "@/lib/types";
import { CONTACT_ASSIGNMENTS } from "@/lib/types";
import { contactMatchesSearch } from "@/lib/contact-search";
import {
  cn,
  contactDisplayName,
  formatDate,
  getEmailDomain,
} from "@/lib/utils";
import {
  deleteContacts,
  fetchAllContacts,
  updateContactsBatch,
} from "@/lib/contacts-api";
import { contactsScaleNotice } from "@/lib/scale-hints";
import { PageHeader } from "@/components/PageHeader";
import { ScaleNotice } from "@/components/ui/ScaleNotice";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { CsvImportModal } from "@/components/contacts/CsvImportModal";
import { contactsToTsv } from "@/lib/contact-clipboard";

const PAGE_SIZES = [50, 100, 250, 500] as const;

type SortKey = keyof Contact | "name";
type SortDir = "asc" | "desc";

const emptyContact = {
  first_name: "",
  last_name: "",
  email: "",
  company: "",
  title: "",
  state: "",
  vertical: "",
  assignment: "unassigned" as ContactAssignment,
  status: "sourced" as ContactStatus,
  phone: "",
  linkedin_url: "",
  sourced_date: "",
  last_contacted_date: "",
};

function contactToForm(c: Contact) {
  return {
    first_name: c.first_name ?? "",
    last_name: c.last_name ?? "",
    email: c.email,
    company: c.company ?? "",
    title: c.title ?? "",
    state: c.state ?? "",
    vertical: c.vertical ?? "",
    assignment: c.assignment,
    status: c.status,
    phone: c.phone ?? "",
    linkedin_url: c.linkedin_url ?? "",
    sourced_date: c.sourced_date?.slice(0, 10) ?? "",
    last_contacted_date: c.last_contacted_date?.slice(0, 10) ?? "",
  };
}

function SortIcon({
  col,
  sortKey,
  sortDir,
}: {
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
}) {
  if (sortKey !== col)
    return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
  return sortDir === "asc" ? (
    <ArrowUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ArrowDown className="ml-1 inline h-3 w-3" />
  );
}

const inputClass =
  "w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400";

export function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verticalFilter, setVerticalFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("sourced_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [form, setForm] = useState(emptyContact);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [bulkState, setBulkState] = useState("");
  const [bulkVertical, setBulkVertical] = useState("");
  const [bulkWorking, setBulkWorking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ active: boolean; mode: "select" | "deselect" }>({
    active: false,
    mode: "select",
  });
  const didDragRef = useRef(false);

  const loadContacts = useCallback(async () => {
    try {
      const data = await fetchAllContacts();
      setContacts(data);
    } catch (e) {
      setActionMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to load contacts",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  const verticals = useMemo(
    () =>
      [...new Set(contacts.map((c) => c.vertical).filter(Boolean))].sort() as string[],
    [contacts]
  );

  const statuses = useMemo(
    () => [...new Set(contacts.map((c) => c.status))].sort(),
    [contacts]
  );

  const filtered = useMemo(() => {
    let list = [...contacts];
    if (search.trim()) {
      list = list.filter((c) => contactMatchesSearch(c, search));
    }
    if (assignmentFilter !== "all")
      list = list.filter((c) => c.assignment === assignmentFilter);
    if (statusFilter !== "all")
      list = list.filter((c) => c.status === statusFilter);
    if (verticalFilter !== "all")
      list = list.filter((c) => c.vertical === verticalFilter);

    list.sort((a, b) => {
      let av: string | number | null = "";
      let bv: string | number | null = "";
      if (sortKey === "name") {
        av = contactDisplayName(a).toLowerCase();
        bv = contactDisplayName(b).toLowerCase();
      } else {
        av = (a[sortKey as keyof Contact] as string | null) ?? "";
        bv = (b[sortKey as keyof Contact] as string | null) ?? "";
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [
    contacts,
    search,
    assignmentFilter,
    statusFilter,
    verticalFilter,
    sortKey,
    sortDir,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
    setLastClickedIndex(null);
  }, [search, assignmentFilter, statusFilter, verticalFilter, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const existingStates = useMemo(
    () =>
      [...new Set(contacts.map((c) => c.state).filter(Boolean))].sort() as string[],
    [contacts]
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allPageSelected =
    paginated.length > 0 && paginated.every((c) => selected.has(c.id));
  const allMatchingSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const pageSomeSelected = paginated.some((c) => selected.has(c.id));

  const selectedContacts = useMemo(
    () => filtered.filter((c) => selected.has(c.id)),
    [filtered, selected]
  );

  useEffect(() => {
    const el = headerCheckboxRef.current;
    if (el) {
      el.indeterminate = pageSomeSelected && !allPageSelected;
    }
  }, [pageSomeSelected, allPageSelected]);

  useEffect(() => {
    const stopDrag = () => {
      dragRef.current.active = false;
      setIsDragging(false);
    };
    window.addEventListener("mouseup", stopDrag);
    return () => window.removeEventListener("mouseup", stopDrag);
  }, []);

  const applySelection = (id: string, mode: "select" | "deselect") => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (mode === "select") next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAllPage = () => {
    if (allPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        paginated.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        paginated.forEach((c) => next.add(c.id));
        return next;
      });
    }
  };

  const selectAllMatching = () => {
    setSelected(new Set(filtered.map((c) => c.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const handleRowCheckbox = (
    id: string,
    index: number,
    shiftKey: boolean
  ) => {
    if (shiftKey && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      const rangeIds = paginated.slice(start, end + 1).map((c) => c.id);
      setSelected((prev) => new Set([...prev, ...rangeIds]));
    } else {
      toggleSelect(id);
    }
    setLastClickedIndex(index);
  };

  const handleRowMouseDown = (
    e: React.MouseEvent,
    id: string,
    rowIndex: number
  ) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, label")) return;

    e.preventDefault();
    didDragRef.current = false;
    const mode = selected.has(id) ? "deselect" : "select";
    dragRef.current = { active: true, mode };
    setIsDragging(true);
    applySelection(id, mode);
    setLastClickedIndex(rowIndex);
  };

  const handleRowMouseEnter = (id: string) => {
    if (!dragRef.current.active) return;
    didDragRef.current = true;
    applySelection(id, dragRef.current.mode);
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 5000);
  };

  const copySelected = useCallback(async () => {
    if (selectedContacts.length === 0) return;
    try {
      await navigator.clipboard.writeText(contactsToTsv(selectedContacts));
      showMessage(
        "success",
        `Copied ${selectedContacts.length.toLocaleString()} contact${selectedContacts.length === 1 ? "" : "s"} — paste into a spreadsheet`
      );
    } catch {
      showMessage("error", "Could not copy to clipboard");
    }
  }, [selectedContacts]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "c") return;
      if (selected.size === 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      void copySelected();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected.size, copySelected]);

  const openAddContact = () => {
    setEditingContactId(null);
    setForm(emptyContact);
    setSaveError(null);
    setModalOpen(true);
  };

  const openEditContact = (c: Contact) => {
    setEditingContactId(c.id);
    setForm(contactToForm(c));
    setSaveError(null);
    setModalOpen(true);
  };

  const closeContactModal = () => {
    setModalOpen(false);
    setEditingContactId(null);
    setForm(emptyContact);
    setSaveError(null);
  };

  const buildContactPayload = () => ({
    first_name: form.first_name.trim() || null,
    last_name: form.last_name.trim() || null,
    email: form.email.trim(),
    company: form.company.trim() || null,
    title: form.title.trim() || null,
    state: form.state.trim() || null,
    vertical: form.vertical.trim() || null,
    assignment: form.assignment,
    status: form.status,
    phone: form.phone.trim() || null,
    linkedin_url: form.linkedin_url.trim() || null,
    company_domain: getEmailDomain(form.email),
    sourced_date: form.sourced_date
      ? new Date(form.sourced_date).toISOString()
      : null,
    last_contacted_date: form.last_contacted_date
      ? new Date(form.last_contacted_date).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  });

  const saveContact = async () => {
    if (!form.email.trim()) return;
    setSaving(true);
    setSaveError(null);
    const payload = buildContactPayload();

    if (editingContactId) {
      const { error } = await supabase
        .from("contacts")
        .update(payload)
        .eq("id", editingContactId);
      setSaving(false);
      if (error) {
        setSaveError(error.message);
        return;
      }
      showMessage("success", "Contact updated");
    } else {
      const insertPayload = {
        ...payload,
        sourced_date:
          payload.sourced_date ??
          (form.status === "sourced" ? new Date().toISOString() : null),
      };
      const { error } = await supabase.from("contacts").insert(insertPayload);
      setSaving(false);
      if (error) {
        setSaveError(error.message);
        return;
      }
      showMessage("success", "Contact added");
    }

    closeContactModal();
    void loadContacts();
  };

  const handleRowClick = (e: React.MouseEvent, c: Contact) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, label")) return;
    openEditContact(c);
  };

  const promoteToLead = async (contactId: string) => {
    const { error } = await supabase
      .from("leads")
      .insert({ contact_id: contactId, status: "responded" });
    if (!error) router.push("/leads");
  };

  const bulkUpdate = async (fields: Record<string, unknown>) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkWorking(true);
    const err = await updateContactsBatch(ids, fields);
    setBulkWorking(false);
    if (err) {
      showMessage("error", err);
      return;
    }
    showMessage("success", `Updated ${ids.length} contacts`);
    setSelected(new Set());
    void loadContacts();
  };

  const bulkAssign = (assignment: ContactAssignment) =>
    bulkUpdate({ assignment });

  const bulkDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (
      !confirm(
        `Delete ${ids.length.toLocaleString()} contact${ids.length === 1 ? "" : "s"}? Related leads and activity will also be removed.`
      )
    )
      return;

    setBulkWorking(true);
    const err = await deleteContacts(ids);
    setBulkWorking(false);

    if (err) {
      showMessage("error", `Delete failed: ${err}`);
      return;
    }

    const deleted = new Set(ids);
    setContacts((prev) => prev.filter((c) => !deleted.has(c.id)));
    setSelected(new Set());
    showMessage("success", `Deleted ${ids.length.toLocaleString()} contacts`);
    void loadContacts();
  };

  const thClass =
    "cursor-pointer whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-gray-500";

  const contactsScale = contactsScaleNotice(contacts.length);

  return (
    <div>
      <PageHeader
        title="Contacts"
        description={
          loading
            ? "Loading contacts…"
            : `${contacts.length.toLocaleString()} total · ${filtered.length.toLocaleString()} matching · page ${page} of ${totalPages}`
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setCsvModalOpen(true)}>
              Import CSV
            </Button>
            <Button onClick={openAddContact}>Add Contact</Button>
          </>
        }
      />

      {contactsScale ? (
        <div className="px-8 pb-2">
          <ScaleNotice
            level={contactsScale.level}
            message={contactsScale.message}
          />
        </div>
      ) : null}

      <div className="border-b border-gray-100 px-8 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search name, email, company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(inputClass, "max-w-xs")}
          />
          <select
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value)}
            className={cn(inputClass, "w-auto")}
          >
            <option value="all">All assignments</option>
            {CONTACT_ASSIGNMENTS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={cn(inputClass, "w-auto")}
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={verticalFilter}
            onChange={(e) => setVerticalFilter(e.target.value)}
            className={cn(inputClass, "w-auto")}
          >
            <option value="all">All verticals</option>
            {verticals.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionMessage ? (
        <p
          className={cn(
            "mx-8 mt-3 rounded-md px-3 py-2 text-sm",
            actionMessage.type === "error"
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          )}
        >
          {actionMessage.text}
        </p>
      ) : null}

      {allPageSelected &&
      filtered.length > paginated.length &&
      !allMatchingSelected ? (
        <div className="border-b border-blue-100 bg-blue-50 px-8 py-2.5 text-sm text-blue-800">
          All {paginated.length} on this page are selected.{" "}
          <button
            type="button"
            className="font-medium underline hover:text-blue-900"
            onClick={selectAllMatching}
          >
            Select all {filtered.length.toLocaleString()} matching contacts
          </button>
        </div>
      ) : null}

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-gray-50 px-8 py-2.5">
          <span className="text-sm font-medium text-gray-700">
            {selected.size.toLocaleString()} selected
            {allMatchingSelected ? " (all matching)" : ""}
          </span>
          <span className="text-xs text-gray-400">
            Drag rows or Shift+click · ⌘/Ctrl+C to copy
          </span>
          <Button
            variant="secondary"
            className="py-1.5 text-xs"
            disabled={bulkWorking}
            onClick={() => void copySelected()}
          >
            Copy
          </Button>
          <Button
            variant="ghost"
            className="py-1.5 text-xs"
            disabled={bulkWorking}
            onClick={clearSelection}
          >
            Clear
          </Button>
          <select
            className={cn(inputClass, "w-auto py-1.5")}
            defaultValue=""
            disabled={bulkWorking}
            onChange={(e) => {
              const v = e.target.value as ContactAssignment;
              if (v) void bulkAssign(v);
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              Assign to…
            </option>
            {CONTACT_ASSIGNMENTS.filter((a) => a !== "unassigned").map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            className={cn(inputClass, "w-auto py-1.5")}
            defaultValue=""
            disabled={bulkWorking}
            onChange={(e) => {
              const v = e.target.value as ContactStatus;
              if (v) void bulkUpdate({ status: v });
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              Set status…
            </option>
            <option value="sourced">sourced</option>
            <option value="contacted">contacted</option>
            <option value="responded">responded</option>
            <option value="qualified">qualified</option>
            <option value="disqualified">disqualified</option>
          </select>
          <input
            list="bulk-states"
            placeholder="Set state…"
            value={bulkState}
            disabled={bulkWorking}
            onChange={(e) => setBulkState(e.target.value)}
            className={cn(inputClass, "w-28 py-1.5")}
          />
          <datalist id="bulk-states">
            {existingStates.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <Button
            variant="secondary"
            className="py-1.5 text-xs"
            disabled={bulkWorking || !bulkState.trim()}
            onClick={() => {
              void bulkUpdate({ state: bulkState.trim() });
              setBulkState("");
            }}
          >
            Apply state
          </Button>
          <input
            placeholder="Set vertical…"
            value={bulkVertical}
            disabled={bulkWorking}
            onChange={(e) => setBulkVertical(e.target.value)}
            className={cn(inputClass, "w-32 py-1.5")}
          />
          <Button
            variant="secondary"
            className="py-1.5 text-xs"
            disabled={bulkWorking || !bulkVertical.trim()}
            onClick={() => {
              void bulkUpdate({ vertical: bulkVertical.trim() });
              setBulkVertical("");
            }}
          >
            Apply vertical
          </Button>
          <Button
            variant="danger"
            disabled={bulkWorking}
            onClick={() => void bulkDelete()}
          >
            {bulkWorking ? "Working…" : "Delete"}
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto px-8 pb-8">
        <table
          className={cn(
            "w-full min-w-[1200px] border-collapse text-sm",
            isDragging && "select-none"
          )}
        >
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-gray-200">
              <th className="w-10 px-3 py-2.5">
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleSelectAllPage}
                  title="Select all on this page"
                  className="rounded border-gray-300"
                />
              </th>
              <th className={thClass} onClick={() => toggleSort("first_name")}>
                First Name <SortIcon col="first_name" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={thClass} onClick={() => toggleSort("last_name")}>
                Last Name <SortIcon col="last_name" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={thClass} onClick={() => toggleSort("email")}>
                Email <SortIcon col="email" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={thClass} onClick={() => toggleSort("company")}>
                Company <SortIcon col="company" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={thClass} onClick={() => toggleSort("title")}>
                Title <SortIcon col="title" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={thClass} onClick={() => toggleSort("state")}>
                State <SortIcon col="state" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={thClass} onClick={() => toggleSort("vertical")}>
                Vertical <SortIcon col="vertical" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={thClass} onClick={() => toggleSort("assignment")}>
                Assignment <SortIcon col="assignment" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={thClass} onClick={() => toggleSort("status")}>
                Status <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={thClass} onClick={() => toggleSort("sourced_date")}>
                Sourced Date <SortIcon col="sourced_date" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th
                className={thClass}
                onClick={() => toggleSort("last_contacted_date")}
              >
                Last Contacted <SortIcon col="last_contacted_date" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className={isDragging ? "select-none" : undefined}>
            {loading ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-gray-400">
                  No contacts found
                </td>
              </tr>
            ) : (
              paginated.map((c, rowIndex) => (
                <tr
                  key={c.id}
                  data-contact-id={c.id}
                  onMouseDown={(e) => handleRowMouseDown(e, c.id, rowIndex)}
                  onMouseEnter={() => handleRowMouseEnter(c.id)}
                  onClick={(e) => handleRowClick(e, c)}
                  className={cn(
                    "border-b border-gray-100 hover:bg-gray-50",
                    selected.has(c.id) && "bg-blue-50/60",
                    isDragging ? "cursor-crosshair" : "cursor-pointer"
                  )}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowCheckbox(c.id, rowIndex, e.shiftKey);
                      }}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-gray-900">{c.first_name || "—"}</td>
                  <td className="px-3 py-2.5 text-gray-900">{c.last_name || "—"}</td>
                  <td className="px-3 py-2.5 text-gray-600">{c.email}</td>
                  <td className="px-3 py-2.5 text-gray-900">{c.company || "—"}</td>
                  <td className="px-3 py-2.5 text-gray-600">{c.title || "—"}</td>
                  <td className="px-3 py-2.5 text-gray-600">{c.state || "—"}</td>
                  <td className="px-3 py-2.5 text-gray-600">{c.vertical || "—"}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="gray">{c.assignment}</Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge
                      variant={
                        c.status === "responded" || c.status === "qualified"
                          ? "green"
                          : c.status === "disqualified"
                            ? "red"
                            : "default"
                      }
                    >
                      {c.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">
                    {formatDate(c.sourced_date)}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">
                    {formatDate(c.last_contacted_date)}
                  </td>
                  <td className="px-3 py-2.5">
                    <Button
                      variant="ghost"
                      className="text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        void promoteToLead(c.id);
                      }}
                    >
                      Promote to Lead
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 px-8 py-4">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, filtered.length)} of{" "}
            {filtered.length.toLocaleString()}
            {filtered.length !== contacts.length
              ? ` (${contacts.length.toLocaleString()} total)`
              : ""}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              Per page
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className={cn(inputClass, "w-auto py-1.5")}
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                className="px-2"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[5rem] text-center text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                className="px-2"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={closeContactModal}
        title={editingContactId ? "Edit Contact" : "Add Contact"}
        wide
      >
        {saveError ? (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {saveError}
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              First Name
            </label>
            <input
              className={inputClass}
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Last Name
            </label>
            <input
              className={inputClass}
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Email *
            </label>
            <input
              className={inputClass}
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Company
            </label>
            <input
              className={inputClass}
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Title
            </label>
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              State
            </label>
            <input
              className={inputClass}
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Vertical
            </label>
            <input
              className={inputClass}
              value={form.vertical}
              onChange={(e) => setForm({ ...form, vertical: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Phone
            </label>
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              LinkedIn URL
            </label>
            <input
              className={inputClass}
              value={form.linkedin_url}
              onChange={(e) =>
                setForm({ ...form, linkedin_url: e.target.value })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Assignment
            </label>
            <select
              className={inputClass}
              value={form.assignment}
              onChange={(e) =>
                setForm({
                  ...form,
                  assignment: e.target.value as ContactAssignment,
                })
              }
            >
              {CONTACT_ASSIGNMENTS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Status
            </label>
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as ContactStatus })
              }
            >
              <option value="sourced">sourced</option>
              <option value="contacted">contacted</option>
              <option value="responded">responded</option>
              <option value="qualified">qualified</option>
              <option value="disqualified">disqualified</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Sourced Date
            </label>
            <input
              type="date"
              className={inputClass}
              value={form.sourced_date}
              onChange={(e) =>
                setForm({ ...form, sourced_date: e.target.value })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Last Contacted
            </label>
            <input
              type="date"
              className={inputClass}
              value={form.last_contacted_date}
              onChange={(e) =>
                setForm({ ...form, last_contacted_date: e.target.value })
              }
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={closeContactModal}>
            Cancel
          </Button>
          <Button onClick={() => void saveContact()} disabled={saving || !form.email.trim()}>
            {saving ? "Saving…" : editingContactId ? "Save Changes" : "Save Contact"}
          </Button>
        </div>
      </Modal>

      <CsvImportModal
        open={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onImported={() => {
          setLoading(true);
          void loadContacts();
          showMessage("success", "Import completed");
        }}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Contact, Template } from "@/lib/types";
import {
  cn,
  contactDisplayName,
  fillTemplate,
} from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
const inputClass =
  "w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400";

type SendStep = "email" | "subject" | "body" | "done";

export function OutreachPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendMode, setSendMode] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [step, setStep] = useState<SendStep>("email");
  const [copiedFlash, setCopiedFlash] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [templateError, setTemplateError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [tRes, cRes] = await Promise.all([
      supabase.from("templates").select("*").order("name"),
      supabase
        .from("contacts")
        .select("*")
        .eq("assignment", "unassigned")
        .neq("status", "contacted")
        .order("first_name"),
    ]);
    if (tRes.data) {
      setTemplates(
        (tRes.data as Template[]).map((t) => ({
          ...t,
          subject_line: t.subject_line ?? "",
          last_used_date: t.last_used_date ?? null,
        }))
      );
    }
    if (cRes.data) setContacts(cRes.data as Contact[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    const q = contactSearch.toLowerCase();
    return contacts.filter(
      (c) =>
        contactDisplayName(c).toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company?.toLowerCase().includes(q) ?? false)
    );
  }, [contacts, contactSearch]);

  const selectedContacts = useMemo(
    () => contacts.filter((c) => selectedIds.has(c.id)),
    [contacts, selectedIds]
  );

  const currentTemplate = templates.find((t) => t.id === templateId);

  const selectTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) {
      setSubject(t.subject_line);
      setBody(t.body);
      setTemplateName(t.name);
    }
  };

  const saveTemplate = async () => {
    if (!templateId) return;
    setSaving(true);
    setTemplateError(null);
    const { error } = await supabase
      .from("templates")
      .update({
        subject_line: subject,
        body,
        name: templateName || currentTemplate?.name,
      })
      .eq("id", templateId);
    setSaving(false);
    if (error) {
      setTemplateError(error.message);
      return;
    }
    void loadData();
  };

  const createTemplate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const name = newTemplateName.trim();
    if (!name) return;
    setSaving(true);
    setTemplateError(null);
    const { data, error } = await supabase
      .from("templates")
      .insert({ name, subject_line: "", body: "" })
      .select()
      .single();
    setSaving(false);
    if (error) {
      setTemplateError(error.message);
      return;
    }
    if (data) {
      const t = data as Template;
      setTemplates((prev) => [...prev, t]);
      selectTemplate(t.id);
      setTemplateName(t.name);
      setNewTemplateOpen(false);
      setNewTemplateName("");
    }
  };

  const toggleContact = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filteredContacts.map((c) => c.id)));
  };

  const startSending = () => {
    if (selectedContacts.length === 0) return;
    setSendMode(true);
    setCurrentIndex(0);
    setStep("email");
    setCompleted(new Set());
    setDoneCount(0);
  };

  const currentContact = selectedContacts[currentIndex];

  const getStepValue = useCallback((): string => {
    if (!currentContact) return "";
    if (step === "email") return currentContact.email;
    if (step === "subject") return fillTemplate(subject, currentContact);
    if (step === "body") return fillTemplate(body, currentContact);
    return "";
  }, [currentContact, step, subject, body]);

  const markSent = useCallback(async () => {
    if (!currentContact) return;
    await supabase
      .from("contacts")
      .update({
        assignment: "personal",
        status: "contacted",
        last_contacted_date: new Date().toISOString(),
      })
      .eq("id", currentContact.id);

    setCompleted((prev) => new Set(prev).add(currentContact.id));
    setDoneCount((n) => n + 1);

    if (currentIndex + 1 >= selectedContacts.length) {
      setStep("done");
    } else {
      setCurrentIndex((i) => i + 1);
      setStep("email");
    }
  }, [currentContact, currentIndex, selectedContacts.length]);

  const copyAndAdvance = useCallback(async () => {
    const value = getStepValue();
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedFlash(true);
    setTimeout(() => setCopiedFlash(false), 800);

    if (step === "body") {
      await markSent();
    } else if (step === "email") {
      setStep("subject");
    } else if (step === "subject") {
      setStep("body");
    }
  }, [step, getStepValue, markSent]);

  useEffect(() => {
    if (!sendMode || step === "done") return;

    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      copyAndAdvance();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sendMode, step, copyAndAdvance]);

  const exitSendMode = () => {
    setSendMode(false);
    setStep("email");
    setCurrentIndex(0);
    loadData();
  };

  if (sendMode) {
    if (step === "done") {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-8">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">All done!</h2>
            <p className="mt-2 text-gray-500">
              Sent outreach to {doneCount} contact{doneCount !== 1 ? "s" : ""}
            </p>
            <Button className="mt-6" onClick={exitSendMode}>
              Back to setup
            </Button>
          </div>
        </div>
      );
    }

    const stepLabels: Record<SendStep, string> = {
      email: "Email address",
      subject: "Subject line",
      body: "Email body",
      done: "",
    };

    return (
      <div className="flex h-[calc(100vh-0px)]">
        <aside className="w-64 shrink-0 border-r border-gray-200 bg-gray-50 p-4">
          <Button variant="ghost" className="mb-4 w-full justify-start" onClick={exitSendMode}>
            ← Back
          </Button>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
            Contacts
          </p>
          <ul className="space-y-1 overflow-y-auto">
            {selectedContacts.map((c, i) => {
              const isCurrent = i === currentIndex;
              const isDone = completed.has(c.id);
              return (
                <li
                  key={c.id}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-sm",
                    isCurrent && "bg-white font-medium shadow-sm",
                    !isCurrent && "text-gray-600"
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate">{contactDisplayName(c)}</span>
                    {isDone && (
                      <Badge variant="green" className="shrink-0 text-[10px]">
                        ✓ sent
                      </Badge>
                    )}
                    {isCurrent && !isDone && (
                      <Check className="h-3 w-3 shrink-0 text-gray-400" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        <main className="relative flex flex-1 flex-col items-center justify-center p-8">
          {copiedFlash && (
            <div className="absolute top-8 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
              ✓ Copied
            </div>
          )}
          <p className="mb-2 text-sm text-gray-500">
            {currentIndex + 1} of {selectedContacts.length}
          </p>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
            {stepLabels[step]}
          </p>
          <h2 className="mb-6 text-center text-lg font-medium text-gray-900">
            {contactDisplayName(currentContact)}
          </h2>
          <div className="w-full max-w-xl rounded-lg border border-gray-200 bg-gray-50 p-6">
            <pre className="whitespace-pre-wrap break-words font-sans text-sm text-gray-800">
              {getStepValue()}
            </pre>
          </div>
          <p className="mt-6 text-sm text-gray-400">
            Press <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs">Space</kbd> to copy &amp; advance
          </p>
        </main>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Outreach"
        description="Select contacts and send with templates"
      />

      <div className="space-y-8 px-8 py-6">
        {templateError && !newTemplateOpen ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {templateError}
          </p>
        ) : null}
        <section>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Select template
              </label>
              <select
                className={inputClass}
                value={templateId}
                onChange={(e) => selectTemplate(e.target.value)}
              >
                <option value="">Choose a template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setNewTemplateName("");
                setTemplateError(null);
                setNewTemplateOpen(true);
              }}
            >
              + New Template
            </Button>
            {templateId && (
              <Button variant="secondary" onClick={saveTemplate} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            )}
          </div>
          {templateId && (
            <div className="mt-4 grid gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Template name
                </label>
                <input
                  className={inputClass}
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Subject
                </label>
                <input
                  className={inputClass}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Body
                </label>
                <textarea
                  className={cn(inputClass, "min-h-[160px]")}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Use {first_name}, {name}, {company}"
                />
              </div>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Unassigned contacts
            </h2>
            <Button variant="secondary" onClick={selectAllFiltered}>
              Select All Filtered
            </Button>
          </div>
          <div className="relative mb-3 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Search contacts…"
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              className={cn(inputClass, "pl-9")}
            />
          </div>
          <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200">
            {loading ? (
              <p className="p-4 text-sm text-gray-400">Loading…</p>
            ) : filteredContacts.length === 0 ? (
              <p className="p-4 text-sm text-gray-400">
                No unassigned contacts (contacted contacts are excluded)
              </p>
            ) : (
              filteredContacts.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-2.5 last:border-0 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggleContact(c.id)}
                    className="rounded border-gray-300"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900">
                      {contactDisplayName(c)}
                    </div>
                    <div className="truncate text-xs text-gray-500">
                      {c.email}
                      {c.company ? ` · ${c.company}` : ""}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {selectedIds.size} selected
            </span>
            <Button
              onClick={startSending}
              disabled={selectedIds.size === 0 || !templateId}
            >
              Start Sending
            </Button>
          </div>
        </section>
      </div>

      <Modal
        open={newTemplateOpen}
        onClose={() => {
          setNewTemplateOpen(false);
          setTemplateError(null);
        }}
        title="New Template"
      >
        {templateError ? (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {templateError}
          </p>
        ) : null}
        <form onSubmit={createTemplate}>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Template name *
          </label>
          <input
            className={inputClass}
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            placeholder="e.g. Cold intro v1"
            autoFocus
            required
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setNewTemplateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !newTemplateName.trim()}>
              {saving ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { FileText, Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchAllContacts } from "@/lib/contacts-api";
import { contactMatchesSearch, sortContactsForSearch } from "@/lib/contact-search";
import {
  createLead,
  fetchLeadWithContact,
  fetchLeadsForBoard,
  removeLead,
  type LeadWithContact,
} from "@/lib/leads-api";
import { PIPELINE_COLUMNS } from "@/lib/constants";
import {
  kanbanCollisionDetection,
  resolveKanbanDropStatus,
} from "@/lib/lead-kanban-dnd";
import { cadenceForStage, followupResetPayload } from "@/lib/followup";
import {
  rescheduleFollowup,
  rpcLogFollowup,
  rpcLogNoshow,
  setNextFollowupAt,
  setPostMeetingEmailSent,
  setProposalMade,
} from "@/lib/leads-followup-rpc";
import { recordMeetingBookedEvent } from "@/lib/lead-meeting-booked";
import { leadsScaleNotice } from "@/lib/scale-hints";
import { KanbanColumn } from "@/components/leads/KanbanColumn";
import { LeadCardOverlay } from "@/components/leads/LeadKanbanCard";
import {
  getLeadTranscriptPdfUrl,
  removeLeadTranscriptPdf,
  uploadLeadTranscriptPdf,
} from "@/lib/lead-transcript-storage";
import type {
  ActiveLeadStatus,
  ClosedReason,
  Contact,
  EmailAccount,
  Lead,
  LeadActivity,
  LeadStatus,
} from "@/lib/types";
import {
  CLOSED_REASON_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
} from "@/lib/types";
import {
  cn,
  contactDisplayName,
  formatDateTime,
  getEmailDomain,
  normalizeEmail,
} from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { ScaleNotice } from "@/components/ui/ScaleNotice";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

const inputClass =
  "w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400";

export function LeadsPage() {
  const searchParams = useSearchParams();
  const leadFromUrl = searchParams.get("lead");
  const openedLeadFromUrl = useRef<string | null>(null);
  const [leads, setLeads] = useState<LeadWithContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [closedReasonFilter, setClosedReasonFilter] = useState<
    ClosedReason | "all"
  >("all");
  const [pendingClosedId, setPendingClosedId] = useState<string | null>(null);
  const [snoozedExpanded, setSnoozedExpanded] = useState<
    Record<string, boolean>
  >({});
  const [drawerLead, setDrawerLead] = useState<LeadWithContact | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null);
  const [notes, setNotes] = useState("");
  const [transcript, setTranscript] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [drawerStatus, setDrawerStatus] = useState<LeadStatus>("responded");
  const [drawerContactEmail, setDrawerContactEmail] = useState("");
  const [drawerContactCompany, setDrawerContactCompany] = useState("");
  const [contactFieldError, setContactFieldError] = useState<string | null>(null);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addLeadSearch, setAddLeadSearch] = useState("");
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [addLeadLoading, setAddLeadLoading] = useState(false);
  const [addLeadSaving, setAddLeadSaving] = useState(false);
  const [addLeadError, setAddLeadError] = useState<string | null>(null);
  const [removingLead, setRemovingLead] = useState(false);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [personalEmailId, setPersonalEmailId] = useState("");
  const [boardSearch, setBoardSearch] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactFirst, setNewContactFirst] = useState("");
  const [newContactLast, setNewContactLast] = useState("");
  const [newContactCompany, setNewContactCompany] = useState("");
  const [transcriptPdfUrl, setTranscriptPdfUrl] = useState<string | null>(null);
  const [transcriptDragging, setTranscriptDragging] = useState(false);
  const [transcriptPdfLoading, setTranscriptPdfLoading] = useState(false);
  const [transcriptPdfError, setTranscriptPdfError] = useState<string | null>(
    null
  );
  const [notesGenerating, setNotesGenerating] = useState(false);
  const [notesSummaryError, setNotesSummaryError] = useState<string | null>(
    null
  );
  const transcriptPdfInputRef = useRef<HTMLInputElement>(null);

  const leadContactIds = useMemo(
    () => new Set(leads.map((l) => l.contact_id)),
    [leads]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLeadsForBoard();
      setLeads(data);
      setLoadError(null);
    } catch (e) {
      setLeads([]);
      setLoadError(e instanceof Error ? e.message : "Failed to load leads.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    if (!leadFromUrl || loading) return;
    if (openedLeadFromUrl.current === leadFromUrl) return;
    const lead = leads.find((l) => l.id === leadFromUrl);
    if (lead) {
      openedLeadFromUrl.current = leadFromUrl;
      applyDrawerLead(lead);
    }
  }, [leadFromUrl, loading, leads]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("email_accounts")
        .select("*")
        .order("email_address");
      if (data) setEmailAccounts(data as EmailAccount[]);
    })();
  }, []);

  const emailById = useMemo(
    () => new Map(emailAccounts.map((a) => [a.id, a.email_address])),
    [emailAccounts]
  );

  const emailAccountOptions = useMemo(
    () =>
      emailAccounts.map((a) => ({
        value: a.id,
        label: a.email_address,
        sublabel: a.status !== "active" ? a.status : undefined,
      })),
    [emailAccounts]
  );

  const closedLeads = useMemo(() => {
    return leads.filter((l) => {
      if (l.status !== "closed") return false;
      if (
        closedReasonFilter !== "all" &&
        l.closed_reason !== closedReasonFilter
      ) {
        return false;
      }
      if (boardSearch.trim() && !contactMatchesSearch(l.contact, boardSearch)) {
        return false;
      }
      return true;
    });
  }, [leads, closedReasonFilter, boardSearch]);

  const closedEmailList = useMemo(() => {
    const emails: string[] = [];
    for (const l of closedLeads) {
      if (l.contact.email) emails.push(l.contact.email);
      if (l.personal_email_account_id) {
        const inbox = emailById.get(l.personal_email_account_id);
        if (inbox) emails.push(inbox);
      }
    }
    return [...new Set(emails)];
  }, [closedLeads, emailById]);

  const pipelineLeads = useMemo(() => {
    return leads.filter((l) => {
      if (l.status === "closed") return false;
      if (boardSearch.trim() && !contactMatchesSearch(l.contact, boardSearch)) {
        return false;
      }
      return true;
    });
  }, [leads, boardSearch]);

  const leadsByStatus = useMemo(() => {
    const map: Record<LeadStatus, LeadWithContact[]> = {
      responded: [],
      meeting_requested: [],
      meeting_booked: [],
      meeting_taken: [],
      "2nd_call_booked": [],
      proposal_sent: [],
      closed: [],
    };
    for (const l of pipelineLeads) {
      map[l.status]?.push(l);
    }
    return map;
  }, [pipelineLeads]);

  const patchLead = (leadId: string, patch: Partial<Lead>) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, ...patch } : l))
    );
    setDrawerLead((prev) =>
      prev?.id === leadId ? { ...prev, ...patch } : prev
    );
  };

  const loadActivities = async (leadId: string) => {
    const { data } = await supabase
      .from("lead_activity")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    if (data) setActivities(data as LeadActivity[]);
  };

  const applyDrawerLead = (lead: LeadWithContact) => {
    setDrawerLead(lead);
    setNotes(lead.notes ?? "");
    setTranscript(lead.meeting_transcript ?? "");
    setFollowUp(
      (lead.next_followup_at ?? lead.follow_up_date)?.slice(0, 10) ?? ""
    );
    setDealValue(lead.deal_value?.toString() ?? "");
    setDrawerStatus(lead.status);
    setPersonalEmailId(lead.personal_email_account_id ?? "");
    setDrawerContactEmail(lead.contact.email);
    setDrawerContactCompany(lead.contact.company ?? "");
    setContactFieldError(null);
    setTranscriptPdfError(null);
    setTranscriptDragging(false);
    setTranscriptPdfUrl(null);
    if (lead.meeting_transcript_path) {
      void getLeadTranscriptPdfUrl(lead.meeting_transcript_path)
        .then(setTranscriptPdfUrl)
        .catch(() =>
          setTranscriptPdfError("Could not load transcript PDF.")
        );
    } else {
      setTranscriptPdfUrl(null);
    }
  };

  const openDrawer = (lead: LeadWithContact) => {
    applyDrawerLead(lead);
    loadActivities(lead.id);
    void (async () => {
      try {
        const full = await fetchLeadWithContact(lead.id);
        applyDrawerLead(full);
        setLeads((prev) =>
          prev.map((l) => (l.id === full.id ? { ...l, ...full, contact: full.contact } : l))
        );
      } catch {
        // Board row data is enough to view; notes may be stale until reload
      }
    })();
  };

  const syncContactInState = (contact: Contact) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.contact_id === contact.id ? { ...l, contact } : l
      )
    );
    setDrawerLead((prev) =>
      prev?.contact_id === contact.id ? { ...prev, contact } : prev
    );
  };

  const saveDrawerContactEmail = async () => {
    if (!drawerLead) return;
    const email = normalizeEmail(drawerContactEmail);
    if (!email || !email.includes("@")) {
      setContactFieldError("Enter a valid email address.");
      setDrawerContactEmail(drawerLead.contact.email);
      return;
    }
    if (email === drawerLead.contact.email) {
      setContactFieldError(null);
      return;
    }

    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing && existing.id !== drawerLead.contact_id) {
      setContactFieldError("Another contact already uses this email.");
      setDrawerContactEmail(drawerLead.contact.email);
      return;
    }

    const { error } = await supabase
      .from("contacts")
      .update({
        email,
        company_domain: getEmailDomain(email),
        updated_at: new Date().toISOString(),
      })
      .eq("id", drawerLead.contact_id);

    if (error) {
      setContactFieldError(error.message);
      setDrawerContactEmail(drawerLead.contact.email);
      return;
    }

    setContactFieldError(null);
    setDrawerContactEmail(email);
    syncContactInState({ ...drawerLead.contact, email, company_domain: getEmailDomain(email) });
  };

  const saveDrawerContactCompany = async () => {
    if (!drawerLead) return;
    const company = drawerContactCompany.trim() || null;
    const current = drawerLead.contact.company?.trim() || null;
    if (company === current) return;

    const { error } = await supabase
      .from("contacts")
      .update({ company, updated_at: new Date().toISOString() })
      .eq("id", drawerLead.contact_id);

    if (error) {
      setContactFieldError(error.message);
      setDrawerContactCompany(drawerLead.contact.company ?? "");
      return;
    }

    setContactFieldError(null);
    syncContactInState({ ...drawerLead.contact, company });
  };

  const logActivity = async (
    leadId: string,
    description: string,
    type = "status_change"
  ) => {
    await supabase.from("lead_activity").insert({
      lead_id: leadId,
      activity_type: type,
      description,
    });
    loadActivities(leadId);
  };

  const updateLeadStatus = async (
    lead: LeadWithContact,
    newStatus: LeadStatus,
    opts?: { fromDrag?: boolean; closedReason?: ClosedReason }
  ): Promise<boolean> => {
    const oldStatus = lead.status;
    if (oldStatus === newStatus && newStatus !== "closed") return true;

    const payload: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === "closed" && opts?.closedReason) {
      payload.closed_reason = opts.closedReason;
    }

    if (oldStatus !== newStatus) {
      payload.status_entered_at = new Date().toISOString();
      Object.assign(
        payload,
        followupResetPayload(
          newStatus === "closed" ? "closed" : (newStatus as ActiveLeadStatus)
        )
      );
    }

    const { error } = await supabase
      .from("leads")
      .update(payload)
      .eq("id", lead.id);

    if (error) {
      alert(
        error.message.includes("leads_status_check") ||
          error.message.includes("check constraint")
          ? `${error.message}\n\nRun supabase/migrations/20250529_lead_followup_system.sql in the Supabase SQL Editor.`
          : error.message
      );
      return false;
    }

    await logActivity(
      lead.id,
      `Moved from ${LEAD_STATUS_LABELS[oldStatus]} to ${LEAD_STATUS_LABELS[newStatus]}`
    );

    if (newStatus === "meeting_booked") {
      const bookingErr = await recordMeetingBookedEvent(lead.id);
      if (bookingErr) console.warn("Demo booking not recorded:", bookingErr);
    }

    patchLead(lead.id, payload as Partial<Lead>);
    if (drawerLead?.id === lead.id) {
      setDrawerStatus(newStatus);
    }
    if (!opts?.fromDrag) void loadLeads();
    return true;
  };

  const closeLeadWithReason = async (
    lead: LeadWithContact,
    reason: ClosedReason
  ) => {
    setPendingClosedId(null);
    const ok = await updateLeadStatus(lead, "closed", { closedReason: reason });
    if (ok && drawerLead?.id === lead.id && reason !== "won") {
      setDrawerLead(null);
    }
  };

  const restoreLeadToPipeline = async (lead: LeadWithContact) => {
    const reset = followupResetPayload("responded");
    const enteredAt = new Date().toISOString();
    await supabase
      .from("leads")
      .update({
        status: "responded",
        closed_reason: null,
        status_entered_at: enteredAt,
        ...reset,
      })
      .eq("id", lead.id);
    patchLead(lead.id, {
      status: "responded",
      closed_reason: null,
      status_entered_at: enteredAt,
      ...reset,
    });
    setDrawerStatus("responded");
  };

  const handleLogFollowup = async (leadId: string) => {
    const { lead, error } = await rpcLogFollowup(leadId);
    if (error) {
      alert(error);
      return;
    }
    if (lead) {
      patchLead(leadId, {
        last_followup_at: lead.last_followup_at,
        next_followup_at: lead.next_followup_at,
        followup_count: lead.followup_count,
        awaiting_response_since: lead.awaiting_response_since,
      });
    }
  };

  const handleLogNoshow = async (leadId: string) => {
    const { lead, error } = await rpcLogNoshow(leadId);
    if (error) {
      alert(error);
      return;
    }
    if (lead) {
      patchLead(leadId, {
        noshow_count: lead.noshow_count,
        next_followup_at: lead.next_followup_at,
      });
    }
  };

  const handleRescheduleFollowup = async (leadId: string, iso: string) => {
    const err = await rescheduleFollowup(leadId, iso);
    if (err) alert(err);
    else
      patchLead(leadId, {
        next_followup_at: iso,
        awaiting_response_since: null,
      });
  };

  const handleMarkProposalMade = async (leadId: string) => {
    const err = await setProposalMade(leadId, true);
    if (err) alert(err);
    else patchLead(leadId, { proposal_made: true });
  };

  const handleMarkPostMeetingEmail = async (leadId: string) => {
    const err = await setPostMeetingEmailSent(leadId);
    if (err) alert(err);
    else patchLead(leadId, { post_meeting_email_sent: true });
  };

  const handleSetFollowupDate = async (leadId: string, iso: string | null) => {
    const lead = leads.find((l) => l.id === leadId);
    const cadence =
      lead && lead.status !== "closed"
        ? cadenceForStage(lead.status as ActiveLeadStatus)
        : null;
    const err = await setNextFollowupAt(leadId, iso, cadence);
    if (err) alert(err);
    else
      patchLead(leadId, {
        next_followup_at: iso,
        ...(cadence != null ? { followup_cadence_days: cadence } : {}),
      });
  };

  const makeCardHandlers = (lead: LeadWithContact) => ({
    onOpen: () => openDrawer(lead),
    onLogFollowup: () => void handleLogFollowup(lead.id),
    onLogNoshow: () => void handleLogNoshow(lead.id),
    onRescheduleFollowup: (iso: string) =>
      void handleRescheduleFollowup(lead.id, iso),
    onSetFollowupDate: (iso: string | null) =>
      void handleSetFollowupDate(lead.id, iso),
    onMarkProposalMade: () => void handleMarkProposalMade(lead.id),
    onMarkPostMeetingEmail: () => void handleMarkPostMeetingEmail(lead.id),
    onPickClosedReason: (reason: ClosedReason) =>
      void closeLeadWithReason(lead, reason),
    onDismissClosedPicker: () => setPendingClosedId(null),
    onCloseOut: () => setPendingClosedId(lead.id),
  });

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
    setDragOverStatus(null);
  };

  const handleDragOver = (e: DragOverEvent) => {
    const status = resolveKanbanDropStatus(e.over, leads);
    if (status) setDragOverStatus(status);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    const newStatus =
      resolveKanbanDropStatus(over, leads) ?? dragOverStatus;
    setDragOverStatus(null);
    if (!newStatus) return;

    const leadId = active.id as string;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    if (lead.status === newStatus) return;

    if (newStatus === "closed") {
      setPendingClosedId(leadId);
      return;
    }

    await updateLeadStatus(lead, newStatus, { fromDrag: true });
    void loadLeads();
  };

  const autosave = async (field: string, value: unknown) => {
    if (!drawerLead) return;
    await supabase
      .from("leads")
      .update({ [field]: value })
      .eq("id", drawerLead.id);
    setLeads((prev) =>
      prev.map((l) =>
        l.id === drawerLead.id ? { ...l, [field]: value } : l
      )
    );
  };

  const saveLegacyTranscript = async (value: string) => {
    const trimmed = value.trim();
    const stored = trimmed || null;
    setTranscript(value);
    await autosave("meeting_transcript", stored);
    if (drawerLead) {
      setDrawerLead({ ...drawerLead, meeting_transcript: stored });
    }
  };

  const summarizeTranscriptToNotes = async (leadId: string) => {
    setNotesGenerating(true);
    setNotesSummaryError(null);
    try {
      const res = await fetch("/api/leads/summarize-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const data = (await res.json()) as { note?: string; error?: string };
      if (!res.ok || !data.note) {
        throw new Error(data.error ?? "Failed to generate note.");
      }
      const note = data.note;
      setNotes(note);
      await autosave("notes", note);
      setDrawerLead((prev) =>
        prev?.id === leadId ? { ...prev, notes: note } : prev
      );
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, notes: note } : l))
      );
    } catch (e) {
      setNotesSummaryError(
        e instanceof Error ? e.message : "Could not generate note."
      );
    } finally {
      setNotesGenerating(false);
    }
  };

  const uploadTranscriptPdf = async (file: File) => {
    if (!drawerLead) return;
    const leadId = drawerLead.id;
    setTranscriptPdfLoading(true);
    setTranscriptPdfError(null);
    setNotesSummaryError(null);
    try {
      const path = await uploadLeadTranscriptPdf(leadId, file);
      await autosave("meeting_transcript_path", path);
      const url = await getLeadTranscriptPdfUrl(path);
      setTranscriptPdfUrl(url);
      setDrawerLead({ ...drawerLead, meeting_transcript_path: path });
      await summarizeTranscriptToNotes(leadId);
    } catch (e) {
      setTranscriptPdfError(
        e instanceof Error ? e.message : "Could not upload PDF."
      );
    } finally {
      setTranscriptPdfLoading(false);
      setTranscriptDragging(false);
    }
  };

  const removeTranscriptPdf = async () => {
    if (!drawerLead?.meeting_transcript_path) return;
    if (!confirm("Remove the meeting transcript PDF?")) return;
    setTranscriptPdfLoading(true);
    setTranscriptPdfError(null);
    try {
      await removeLeadTranscriptPdf(drawerLead.meeting_transcript_path);
      await autosave("meeting_transcript_path", null);
      setTranscriptPdfUrl(null);
      setDrawerLead({ ...drawerLead, meeting_transcript_path: null });
    } catch (e) {
      setTranscriptPdfError(
        e instanceof Error ? e.message : "Could not remove PDF."
      );
    } finally {
      setTranscriptPdfLoading(false);
    }
  };

  const handleTranscriptPdfDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTranscriptDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void uploadTranscriptPdf(file);
  };

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  const openAddLeadModal = async () => {
    setAddLeadOpen(true);
    setAddLeadSearch("");
    setNewContactEmail("");
    setNewContactFirst("");
    setNewContactLast("");
    setNewContactCompany("");
    setAddLeadError(null);
    setAddLeadLoading(true);
    try {
      const data = await fetchAllContacts();
      setAllContacts(data);
    } catch (e) {
      setAddLeadError(
        e instanceof Error ? e.message : "Failed to load contacts"
      );
    }
    setAddLeadLoading(false);
  };

  const contactsAvailableForLead = useMemo(() => {
    const availableBase = allContacts.filter((c) => !leadContactIds.has(c.id));
    const q = addLeadSearch.trim();
    const sorted = sortContactsForSearch(availableBase, q);
    return q ? sorted : sorted.slice(0, 100);
  }, [allContacts, leadContactIds, addLeadSearch]);

  const contactsListLimit = addLeadSearch.trim() ? 500 : 100;

  const handleCreateContactAndLead = async () => {
    const email = normalizeEmail(newContactEmail || addLeadSearch);
    if (!email || !email.includes("@")) {
      setAddLeadError("Enter a valid email address.");
      return;
    }
    setAddLeadSaving(true);
    setAddLeadError(null);

    const { data: existing } = await supabase
      .from("contacts")
      .select("id, email, first_name, last_name")
      .eq("email", email)
      .maybeSingle();

    let contactId: string;
    if (existing) {
      contactId = existing.id;
      if (leadContactIds.has(contactId)) {
        setAddLeadSaving(false);
        setAddLeadError("This contact is already on the board.");
        return;
      }
    } else {
      const { data: created, error } = await supabase
        .from("contacts")
        .insert({
          email,
          first_name: newContactFirst.trim() || null,
          last_name: newContactLast.trim() || null,
          company: newContactCompany.trim() || null,
          company_domain: getEmailDomain(email),
          assignment: "personal",
          status: "responded",
          sourced_date: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error || !created) {
        setAddLeadSaving(false);
        setAddLeadError(error?.message ?? "Failed to create contact.");
        return;
      }
      contactId = created.id;
    }

    const result = await createLead(contactId, "responded");
    setAddLeadSaving(false);
    if ("error" in result) {
      setAddLeadError(result.error);
      return;
    }
    setAddLeadOpen(false);
    await loadLeads();
  };

  const handleAddLead = async (contactId: string) => {
    setAddLeadSaving(true);
    setAddLeadError(null);
    const result = await createLead(contactId, "responded");
    setAddLeadSaving(false);
    if ("error" in result) {
      setAddLeadError(result.error);
      return;
    }
    setAddLeadOpen(false);
    await loadLeads();
  };

  const handleRemoveLead = async () => {
    if (!drawerLead) return;
    if (
      !confirm(
        "Remove this lead from the pipeline? The contact will stay in Contacts."
      )
    )
      return;
    setRemovingLead(true);
    const err = await removeLead(drawerLead.id);
    setRemovingLead(false);
    if (err) {
      alert(err);
      return;
    }
    setDrawerLead(null);
    await loadLeads();
  };

  const pipelineColumns: LeadStatus[] = showClosed
    ? [...PIPELINE_COLUMNS, "closed"]
    : [...PIPELINE_COLUMNS];

  const leadsForColumn = (status: LeadStatus) =>
    status === "closed" ? closedLeads : (leadsByStatus[status] ?? []);

  const leadsScale = leadsScaleNotice(leads.length);

  return (
    <div>
      <PageHeader
        title="Leads"
        description={`${pipelineLeads.length} active`}
        actions={
          <>
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Search leads…"
                value={boardSearch}
                onChange={(e) => setBoardSearch(e.target.value)}
                className={cn(inputClass, "w-56 py-1.5 pl-8")}
              />
            </div>
            <Button onClick={() => void openAddLeadModal()}>Add Lead</Button>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showClosed}
                onChange={(e) => setShowClosed(e.target.checked)}
                className="rounded border-gray-300"
              />
              Show closed ({leads.filter((l) => l.status === "closed").length})
            </label>
            {showClosed ? (
              <select
                className="rounded-md border border-gray-200 px-2 py-1 text-sm"
                value={closedReasonFilter}
                onChange={(e) =>
                  setClosedReasonFilter(e.target.value as ClosedReason | "all")
                }
              >
                <option value="all">All reasons</option>
                {(["won", "lost", "non_fit", "ghosted"] as ClosedReason[]).map(
                  (r) => (
                    <option key={r} value={r}>
                      {CLOSED_REASON_LABELS[r]}
                    </option>
                  )
                )}
              </select>
            ) : null}
          </>
        }
      />

      {leadsScale ? (
        <div className="px-8 pb-2">
          <ScaleNotice level={leadsScale.level} message={leadsScale.message} />
        </div>
      ) : null}
      {loadError ? (
        <div className="px-8 pb-2">
          <ScaleNotice level="warn" message={loadError} />
        </div>
      ) : null}

      <div className="border-b border-gray-100 px-8 py-3 sm:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search leads…"
            value={boardSearch}
            onChange={(e) => setBoardSearch(e.target.value)}
            className={cn(inputClass, "pl-9")}
          />
        </div>
      </div>

      {loading ? (
        <p className="px-8 py-12 text-center text-gray-400">Loading…</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={kanbanCollisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col gap-6 px-8 pb-8">
            <div className="flex gap-3 overflow-x-auto">
              {pipelineColumns.map((status) => (
                <div key={status} id={status} data-status={status}>
                  <KanbanColumn
                    status={status}
                    leads={leadsForColumn(status)}
                    snoozedExpanded={snoozedExpanded[status] ?? false}
                    onToggleSnoozed={() =>
                      setSnoozedExpanded((prev) => ({
                        ...prev,
                        [status]: !prev[status],
                      }))
                    }
                    pendingClosedId={pendingClosedId}
                    getHandlers={makeCardHandlers}
                    emptyHint={
                      status === "closed"
                        ? "Drag here to close — pick a reason on the card"
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>
            {showClosed ? (
              <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <h3 className="text-sm font-medium text-[var(--foreground)]">
                  Closed emails
                </h3>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  Contact and inbox emails for closed leads
                  {closedReasonFilter !== "all"
                    ? ` (${CLOSED_REASON_LABELS[closedReasonFilter]})`
                    : ""}
                  .
                </p>
                {closedEmailList.length === 0 ? (
                  <p className="mt-4 text-sm text-[var(--muted)]">No emails.</p>
                ) : (
                  <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto font-mono text-sm">
                    {closedEmailList.map((email) => (
                      <li key={email} className="rounded px-2 py-1">
                        {email}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
          <DragOverlay>
            {activeLead ? (
              <LeadCardOverlay
                lead={activeLead}
                columnStatus={activeLead.status}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {drawerLead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setDrawerLead(null)}
          />
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">
                {contactDisplayName(drawerLead.contact)}
              </h2>
              <button
                type="button"
                onClick={() => setDrawerLead(null)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {drawerLead.status === "closed" ? (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => void restoreLeadToPipeline(drawerLead)}
                >
                  Restore to pipeline (Responded)
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setPendingClosedId(drawerLead.id)}
                >
                  Close lead…
                </Button>
              )}
              {pendingClosedId === drawerLead.id ? (
                <div className="grid grid-cols-2 gap-2">
                  {(["won", "lost", "non_fit", "ghosted"] as ClosedReason[]).map(
                    (r) => (
                      <Button
                        key={r}
                        variant="secondary"
                        onClick={() => void closeLeadWithReason(drawerLead, r)}
                      >
                        {CLOSED_REASON_LABELS[r]}
                      </Button>
                    )
                  )}
                </div>
              ) : null}
              <Button
                variant="secondary"
                className="w-full text-sm text-red-600 hover:text-red-700"
                disabled={removingLead}
                onClick={() => void handleRemoveLead()}
              >
                {removingLead ? "Removing…" : "Remove from pipeline"}
              </Button>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Email
                  </label>
                  <input
                    type="email"
                    className={inputClass}
                    value={drawerContactEmail}
                    onChange={(e) => {
                      setDrawerContactEmail(e.target.value);
                      setContactFieldError(null);
                    }}
                    onBlur={() => void saveDrawerContactEmail()}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Company
                  </label>
                  <input
                    className={inputClass}
                    value={drawerContactCompany}
                    onChange={(e) => {
                      setDrawerContactCompany(e.target.value);
                      setContactFieldError(null);
                    }}
                    onBlur={() => void saveDrawerContactCompany()}
                  />
                </div>
                {contactFieldError ? (
                  <p className="text-xs text-red-600">{contactFieldError}</p>
                ) : null}
                {drawerLead.contact.title ? (
                  <p className="text-xs text-gray-500">
                    {drawerLead.contact.title}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Personal email
                </label>
                <SearchableSelect
                  options={emailAccountOptions}
                  value={personalEmailId}
                  onChange={async (v) => {
                    setPersonalEmailId(v);
                    const id = v || null;
                    await autosave("personal_email_account_id", id);
                    setDrawerLead((prev) =>
                      prev
                        ? { ...prev, personal_email_account_id: id }
                        : prev
                    );
                    setLeads((prev) =>
                      prev.map((l) =>
                        l.id === drawerLead.id
                          ? { ...l, personal_email_account_id: id }
                          : l
                      )
                    );
                  }}
                  placeholder="Search inboxes…"
                  emptyLabel="Not set"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Inbox you use for this lead — shown in Analytics.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Status
                </label>
                <select
                  className={inputClass}
                  value={drawerStatus}
                  onChange={async (e) => {
                    const s = e.target.value as LeadStatus;
                    setDrawerStatus(s);
                    if (s === "closed") {
                      setPendingClosedId(drawerLead.id);
                      return;
                    }
                    const ok = await updateLeadStatus(drawerLead, s);
                    if (ok) setDrawerStatus(s);
                  }}
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {LEAD_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-gray-500">
                    Notes
                  </label>
                  {drawerLead.meeting_transcript_path ? (
                    <button
                      type="button"
                      disabled={notesGenerating || transcriptPdfLoading}
                      onClick={() =>
                        void summarizeTranscriptToNotes(drawerLead.id)
                      }
                      className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                    >
                      {notesGenerating ? "Regenerating…" : "Regenerate AI summary"}
                    </button>
                  ) : null}
                </div>
                {notesGenerating ? (
                  <p className="mb-2 text-xs text-indigo-600">
                    Generating note from transcript…
                  </p>
                ) : null}
                <textarea
                  className={cn(inputClass, "min-h-[100px]")}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setNotesSummaryError(null);
                  }}
                  onBlur={() => autosave("notes", notes || null)}
                  disabled={notesGenerating}
                />
                {notesSummaryError ? (
                  <p className="mt-1 text-xs text-red-600">{notesSummaryError}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">
                    Auto-filled from transcript when you upload a PDF. Use
                    Regenerate to refresh bullets.
                  </p>
                )}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-gray-500">
                    Meeting transcript (PDF)
                  </label>
                  <button
                    type="button"
                    disabled={transcriptPdfLoading}
                    onClick={() => transcriptPdfInputRef.current?.click()}
                    className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                  >
                    {transcriptPdfUrl ? "Replace PDF" : "Upload PDF"}
                  </button>
                </div>
                <input
                  ref={transcriptPdfInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadTranscriptPdf(file);
                    e.target.value = "";
                  }}
                />
                <div
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setTranscriptDragging(true);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    if (
                      !e.currentTarget.contains(
                        e.relatedTarget as Node | null
                      )
                    ) {
                      setTranscriptDragging(false);
                    }
                  }}
                  onDrop={handleTranscriptPdfDrop}
                  className={cn(
                    "relative rounded-md transition-shadow",
                    transcriptDragging &&
                      "ring-2 ring-indigo-400 ring-offset-1"
                  )}
                >
                  {transcriptPdfLoading ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-white/80 text-sm text-gray-600">
                      {transcriptPdfUrl ? "Updating PDF…" : "Uploading PDF…"}
                    </div>
                  ) : null}
                  {transcriptPdfUrl ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <a
                          href={transcriptPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          Open in new tab
                        </a>
                        <button
                          type="button"
                          disabled={transcriptPdfLoading}
                          onClick={() => void removeTranscriptPdf()}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          Remove PDF
                        </button>
                      </div>
                      <iframe
                        src={transcriptPdfUrl}
                        title="Meeting transcript PDF"
                        className="h-72 w-full rounded-md border border-gray-200 bg-gray-50"
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "flex min-h-[120px] flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center",
                        transcriptDragging && "border-indigo-300 bg-indigo-50/50"
                      )}
                    >
                      <FileText className="mb-2 h-8 w-8 text-gray-300" />
                      <p className="text-sm text-gray-600">
                        Drop a PDF here to attach the transcript
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        The file is stored as-is (not converted to text)
                      </p>
                    </div>
                  )}
                </div>
                {transcriptPdfError ? (
                  <p className="mt-1 text-xs text-red-600">
                    {transcriptPdfError}
                  </p>
                ) : null}
                {drawerLead.meeting_transcript &&
                !drawerLead.meeting_transcript_path ? (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-medium text-gray-500">
                      Legacy text transcript
                    </summary>
                    <textarea
                      className={cn(inputClass, "mt-2 min-h-[80px]")}
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      onBlur={() => void saveLegacyTranscript(transcript)}
                    />
                  </details>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Next follow-up
                </label>
                <input
                  type="date"
                  className={inputClass}
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  onBlur={() => {
                    const iso = followUp
                      ? new Date(`${followUp}T12:00:00`).toISOString()
                      : null;
                    void handleSetFollowupDate(drawerLead.id, iso);
                  }}
                />
              </div>

              {drawerLead.closed_reason ? (
                <p className="text-xs text-gray-500">
                  Closed: {CLOSED_REASON_LABELS[drawerLead.closed_reason]}
                </p>
              ) : null}

              {drawerStatus === "closed" &&
              drawerLead.closed_reason === "won" ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Deal value
                  </label>
                  <input
                    type="number"
                    className={inputClass}
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    onBlur={() =>
                      autosave(
                        "deal_value",
                        dealValue ? Number(dealValue) : null
                      )
                    }
                  />
                </div>
              ) : null}

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Activity
                </h3>
                <ul className="space-y-2">
                  {activities.length === 0 ? (
                    <li className="text-sm text-gray-400">No activity yet</li>
                  ) : (
                    activities.map((a) => (
                      <li
                        key={a.id}
                        className="rounded border border-gray-100 px-3 py-2 text-sm"
                      >
                        <p className="text-gray-900">{a.description}</p>
                        <p className="text-xs text-gray-400">
                          {formatDateTime(a.created_at)}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </aside>
        </div>
      )}

      <Modal
        open={addLeadOpen}
        onClose={() => setAddLeadOpen(false)}
        title="Add Lead"
        wide
      >
        <p className="mb-3 text-sm text-gray-600">
          Pick a contact who is not already on the board. They stay in Contacts
          when removed from the pipeline.
        </p>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search contacts…"
            value={addLeadSearch}
            onChange={(e) => setAddLeadSearch(e.target.value)}
            className={cn(inputClass, "pl-9")}
          />
        </div>
        {addLeadError ? (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {addLeadError}
          </p>
        ) : null}
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {addLeadLoading ? (
            <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
          ) : (
            <>
              {contactsAvailableForLead.length === 0 && !addLeadSearch.trim() ? (
                <p className="py-4 text-center text-sm text-gray-400">
                  No contacts available — search or create one below
                </p>
              ) : (
                contactsAvailableForLead
                  .slice(0, contactsListLimit)
                  .map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={addLeadSaving}
                onClick={() => void handleAddLead(c.id)}
                className="flex w-full items-center justify-between rounded-md border border-gray-100 px-3 py-2.5 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                <span>
                  <span className="font-medium text-gray-900">
                    {contactDisplayName(c)}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    {c.email}
                    {c.company ? ` · ${c.company}` : ""}
                  </span>
                </span>
                <span className="text-xs text-gray-400">Add</span>
              </button>
                  ))
              )}
            </>
          )}
        </div>
        {contactsAvailableForLead.length > contactsListLimit ? (
          <p className="mt-2 text-xs text-gray-400">
            Showing first {contactsListLimit} of{" "}
            {contactsAvailableForLead.length} — refine your search
          </p>
        ) : null}

        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Or create new contact
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Email *
              </label>
              <input
                type="email"
                className={inputClass}
                placeholder={
                  addLeadSearch.includes("@") ? addLeadSearch : "email@company.com"
                }
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                First name
              </label>
              <input
                className={inputClass}
                value={newContactFirst}
                onChange={(e) => setNewContactFirst(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Last name
              </label>
              <input
                className={inputClass}
                value={newContactLast}
                onChange={(e) => setNewContactLast(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Company
              </label>
              <input
                className={inputClass}
                value={newContactCompany}
                onChange={(e) => setNewContactCompany(e.target.value)}
              />
            </div>
          </div>
          <Button
            className="mt-3 w-full"
            disabled={addLeadSaving}
            onClick={() => void handleCreateContactAndLead()}
          >
            {addLeadSaving ? "Adding…" : "Create contact & add to board"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

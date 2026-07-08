"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { fetchAllContacts } from "@/lib/contacts-api";
import { fetchAllLeads } from "@/lib/leads-api";
import { contactsScaleNotice, leadsScaleNotice } from "@/lib/scale-hints";
import { supabase } from "@/lib/supabase";
import type {
  Contact,
  ContactAssignment,
  DailySendingVolume,
  EmailAccount,
  Lead,
  LeadMeetingBookedEvent,
} from "@/lib/types";
import { KANBAN_COLUMNS, LEAD_STATUS_LABELS } from "@/lib/types";
import {
  dailyVolumeChartData,
  fetchDailyVolumeHistory,
  isWeekend,
  isWeekendLogDate,
  recordTodaySendingVolume,
  sumAccountDailyVolumeForAnalytics,
} from "@/lib/email-volume";
import { backfillMeetingBookedEvents } from "@/lib/lead-meeting-booked";
import { barFillForLogDate } from "@/lib/chart-utils";
import {
  fetchMeetingBookedEvents,
  listMeetingBookings,
  meetingBookedPerDay,
  meetingBookedPerWeek,
  meetingBookedStats,
  meetingBookedThisWeekBreakdown,
} from "@/lib/meeting-booked-analytics";
import { personalEmailLeadStats } from "@/lib/personal-email-analytics";
import { cn, getLeadStuckLevel, groupByDate } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ScaleNotice } from "@/components/ui/ScaleNotice";

const PIE_COLORS = ["#6b7280", "#3b82f6", "#8b5cf6", "#10b981"];
const ASSIGNMENTS: ContactAssignment[] = [
  "unassigned",
  "instantly",
  "smartlead",
  "personal",
];

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export function AnalyticsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [emails, setEmails] = useState<EmailAccount[]>([]);
  const [volumeHistory, setVolumeHistory] = useState<DailySendingVolume[]>([]);
  const [meetingBookedEvents, setMeetingBookedEvents] = useState<
    LeadMeetingBookedEvent[]
  >([]);
  const [meetingBookedError, setMeetingBookedError] = useState<string | null>(
    null
  );
  const [backfillNote, setBackfillNote] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setMeetingBookedError(null);
    setBackfillNote(null);

    const [contactsResult, leadsResult, eRes, history] =
      await Promise.allSettled([
        fetchAllContacts(),
        fetchAllLeads(),
        supabase.from("email_accounts").select("*"),
        fetchDailyVolumeHistory(30),
      ]);

    if (contactsResult.status === "fulfilled") {
      setContacts(contactsResult.value);
    } else {
      setContacts([]);
      setLoadError(
        contactsResult.reason instanceof Error
          ? contactsResult.reason.message
          : "Failed to load contacts."
      );
    }

    if (leadsResult.status === "fulfilled") {
      setLeads(leadsResult.value);
    } else {
      setLeads([]);
      setLoadError((prev) =>
        prev
          ? prev
          : leadsResult.reason instanceof Error
            ? leadsResult.reason.message
            : "Failed to load leads."
      );
    }

    if (eRes.status === "fulfilled" && eRes.value.data) {
      const list = eRes.value.data as EmailAccount[];
      setEmails(list);
      await recordTodaySendingVolume(list);
    }

    if (history.status === "fulfilled") {
      setVolumeHistory(history.value);
    }

    const backfill = await backfillMeetingBookedEvents();
    if (backfill.error) {
      setMeetingBookedError(backfill.error);
    } else if (backfill.inserted > 0) {
      setBackfillNote(
        `Imported ${backfill.inserted} past demo booking${backfill.inserted !== 1 ? "s" : ""} from your lead history.`
      );
    }

    const booked = await fetchMeetingBookedEvents();
    setMeetingBookedEvents(booked.events);
    if (booked.error) {
      setMeetingBookedError(booked.error);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const now = useMemo(() => new Date(), []);

  const contactStats = useMemo(() => {
    const total = contacts.length;
    const weekAgo = subDays(now, 7);
    const monthAgo = subDays(now, 30);
    const last7 = contacts.filter(
      (c) => c.created_at && parseISO(c.created_at) >= weekAgo
    ).length;
    const last30 = contacts.filter(
      (c) => c.created_at && parseISO(c.created_at) >= monthAgo
    ).length;
    return { total, last7, last30 };
  }, [contacts, now]);

  const sourcedPerDay = useMemo(() => {
    const items = contacts
      .filter((c) => c.sourced_date)
      .map((c) => ({
        date: format(parseISO(c.sourced_date!), "yyyy-MM-dd"),
      }));
    return groupByDate(items, 30);
  }, [contacts]);

  const contactedPerDay = useMemo(() => {
    const items = contacts
      .filter((c) => c.last_contacted_date)
      .map((c) => ({
        date: format(parseISO(c.last_contacted_date!), "yyyy-MM-dd"),
      }));
    return groupByDate(items, 30);
  }, [contacts]);

  const assignmentPie = useMemo(() => {
    return ASSIGNMENTS.map((a) => ({
      name: a,
      value: contacts.filter((c) => c.assignment === a).length,
    })).filter((d) => d.value > 0);
  }, [contacts]);

  const funnelData = useMemo(() => {
    return KANBAN_COLUMNS.map((status) => ({
      name: LEAD_STATUS_LABELS[status],
      count: leads.filter((l) => l.status === status).length,
    }));
  }, [leads]);

  const meetingBookedDaily = useMemo(
    () => meetingBookedPerDay(meetingBookedEvents, 30),
    [meetingBookedEvents]
  );

  const meetingBookedWeekly = useMemo(
    () => meetingBookedPerWeek(meetingBookedEvents, 12),
    [meetingBookedEvents]
  );

  const meetingBookedSummary = useMemo(
    () => meetingBookedStats(meetingBookedEvents),
    [meetingBookedEvents]
  );

  const recentBookings = useMemo(
    () => listMeetingBookings(meetingBookedEvents, 14),
    [meetingBookedEvents]
  );

  const thisWeekByDay = useMemo(
    () => meetingBookedThisWeekBreakdown(meetingBookedEvents),
    [meetingBookedEvents]
  );

  const responseRate = useMemo(() => {
    return ["instantly", "smartlead", "personal"].map((assignment) => {
      const contacted = contacts.filter(
        (c) =>
          c.assignment === assignment &&
          ["contacted", "responded", "qualified", "disqualified"].includes(
            c.status
          )
      );
      const leadCount = leads.filter((l) => {
        const c = contacts.find((x) => x.id === l.contact_id);
        return c?.assignment === assignment;
      }).length;
      const pct =
        contacted.length > 0
          ? Math.round((leadCount / contacted.length) * 100)
          : 0;
      return {
        assignment,
        contacted: contacted.length,
        leads: leadCount,
        rate: pct,
      };
    });
  }, [contacts, leads]);

  const currentDailyVolume = useMemo(
    () => sumAccountDailyVolumeForAnalytics(emails),
    [emails]
  );

  const personalEmailStats = useMemo(
    () => personalEmailLeadStats(emails, leads),
    [emails, leads]
  );

  const dailyVolumePerDay = useMemo(
    () => dailyVolumeChartData(volumeHistory, 30),
    [volumeHistory]
  );

  const emailStats = useMemo(() => {
    const active = emails.filter((e) => e.status === "active");
    const monthlyCost = active.reduce((s, e) => s + (e.monthly_cost ?? 0), 0);
    const byStatus = ["active", "warming", "paused", "dead"].map((s) => ({
      status: s,
      count: emails.filter((e) => e.status === s).length,
    }));
    const scores = emails
      .map((e) => e.last_mailreach_score)
      .filter((s): s is number => s != null);
    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
    return { monthlyCost, byStatus, avgScore, total: emails.length };
  }, [emails]);

  const stuckCounts = useMemo(() => {
    let yellow = 0;
    let red = 0;
    for (const lead of leads) {
      const level = getLeadStuckLevel(lead);
      if (level === "yellow") yellow++;
      if (level === "red") red++;
    }
    return { yellow, red };
  }, [leads]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Analytics" />
        <p className="px-8 py-12 text-center text-gray-400">Loading…</p>
      </div>
    );
  }

  const contactsScale = contactsScaleNotice(contacts.length);
  const leadsScale = leadsScaleNotice(leads.length);

  return (
    <div>
      <PageHeader title="Analytics" description="CRM overview" />

      {loadError ? (
        <p className="mx-8 mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      ) : null}

      {contactsScale || leadsScale ? (
        <div className="space-y-2 px-8 pb-2">
          {contactsScale ? (
            <ScaleNotice
              level={contactsScale.level}
              message={contactsScale.message}
            />
          ) : null}
          {leadsScale ? (
            <ScaleNotice level={leadsScale.level} message={leadsScale.message} />
          ) : null}
        </div>
      ) : null}

      <div className="space-y-8 px-8 py-6">
        <section>
          <h2 className="mb-1 text-sm font-semibold text-gray-900">
            Demos booked
          </h2>
          <p className="mb-3 text-xs text-gray-500">
            Counts when a lead first moves into Meeting Booked (e.g. from
            Meeting Requested). Each lead is counted once, even if moved out and
            back later.
          </p>

          {meetingBookedError ? (
            <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {meetingBookedError}
            </p>
          ) : null}
          {backfillNote ? (
            <p className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {backfillNote}
            </p>
          ) : null}

          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Today" value={meetingBookedSummary.todayCount} />
            <StatCard
              label="This week"
              value={meetingBookedSummary.thisWeek}
              sub="Mon–Sun"
            />
            <StatCard
              label="All time"
              value={meetingBookedSummary.allTime}
              sub="Unique leads"
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-6">
            <div>
              <h3 className="mb-2 text-xs font-medium text-gray-500">
                Booked per day (30d)
              </h3>
              <div className="h-48 rounded-lg border border-gray-200 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={meetingBookedDaily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {meetingBookedDaily.map((row) => (
                        <Cell
                          key={row.iso}
                          fill={barFillForLogDate(row.iso, "#059669")}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-medium text-gray-500">
                Booked per week (12w)
              </h3>
              <div className="h-48 rounded-lg border border-gray-200 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={meetingBookedWeekly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 9 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="#059669"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-medium text-gray-500">
                This week (by day)
              </h3>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Day
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                        Demos
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {thisWeekByDay.map((row) => {
                      const weekend = isWeekendLogDate(row.iso);
                      return (
                        <tr
                          key={row.iso}
                          className="border-b border-gray-50 last:border-0"
                        >
                          <td
                            className={cn(
                              "px-4 py-2",
                              weekend ? "text-gray-400" : "text-gray-900"
                            )}
                          >
                            {row.date}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-2 text-right font-semibold",
                              weekend ? "text-gray-400" : "text-emerald-700"
                            )}
                          >
                            {row.count}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-emerald-50/60">
                      <td className="px-4 py-2 text-xs font-semibold uppercase text-gray-600">
                        This week total
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-800">
                        {meetingBookedSummary.thisWeek}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-medium text-gray-500">
                Recent bookings (14d)
              </h3>
              {recentBookings.length === 0 ? (
                <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                  No bookings to list yet.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="border-b border-gray-100">
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Date
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Lead
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookings.map((row) => (
                        <tr
                          key={`${row.leadId}-${row.bookedOn}`}
                          className="border-b border-gray-50 last:border-0"
                        >
                          <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-600">
                            {row.bookedOnLabel}
                          </td>
                          <td className="px-4 py-2">
                            <div className="font-medium text-gray-900">
                              {row.leadName}
                            </div>
                            {row.company ? (
                              <div className="text-xs text-gray-500">
                                {row.company}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Contacts</h2>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="All time" value={contactStats.total} />
            <StatCard label="Last 7 days" value={contactStats.last7} />
            <StatCard label="Last 30 days" value={contactStats.last30} />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="mb-2 text-xs font-medium text-gray-500">
              Sourced per day (30d)
            </h3>
            <div className="h-48 rounded-lg border border-gray-200 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sourcedPerDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#374151"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium text-gray-500">
              Contacted per day (30d)
            </h3>
            <div className="h-48 rounded-lg border border-gray-200 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={contactedPerDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#6b7280"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="mb-2 text-xs font-medium text-gray-500">
              Assignment breakdown
            </h3>
            <div className="h-48 rounded-lg border border-gray-200 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assignmentPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {assignmentPie.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium text-gray-500">
              Lead funnel
            </h3>
            <div className="h-48 rounded-lg border border-gray-200 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 9 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#374151" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-medium text-gray-500">
            Response rate by assignment
          </h3>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Assignment
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Contacted
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Leads
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {responseRate.map((r) => (
                  <tr key={r.assignment} className="border-b border-gray-50">
                    <td className="px-4 py-2 capitalize">{r.assignment}</td>
                    <td className="px-4 py-2">{r.contacted}</td>
                    <td className="px-4 py-2">{r.leads}</td>
                    <td className="px-4 py-2">{r.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Email accounts
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Current daily volume"
              value={currentDailyVolume.toLocaleString()}
              sub={
                isWeekend()
                  ? "Weekends excluded — Mon–Fri only"
                  : "emails / day (all inboxes, weekdays)"
              }
            />
            <StatCard
              label="Monthly cost (active)"
              value={`$${emailStats.monthlyCost.toFixed(2)}`}
            />
            <StatCard label="Total accounts" value={emailStats.total} />
            <StatCard
              label="Avg Mailreach score"
              value={emailStats.avgScore || "—"}
            />
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                By status
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {emailStats.byStatus.map((s) => (
                  <Badge key={s.status} variant="gray">
                    {s.status}: {s.count}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="mb-1 text-xs font-medium text-gray-500">
              Daily sending capacity (30d)
            </h3>
            <p className="mb-2 text-xs text-gray-400">
              Weekdays only — Saturday and Sunday are not recorded or counted.
              Each weekday stores the last volume set that day.
            </p>
            <div className="h-48 rounded-lg border border-gray-200 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyVolumePerDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="volume"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Personal email (leads)
          </h2>
          <p className="mb-3 text-xs text-gray-500">
            Per-inbox stats from leads where you set a personal sending email.
          </p>
          {personalEmailStats.length === 0 ? (
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
              No leads have a personal email assigned yet. Set one in the lead
              drawer on the Leads tab.
            </p>
          ) : (
            <>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Inbox
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Leads
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Active
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Won
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Lost
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Deal value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {personalEmailStats.map((row) => (
                    <tr
                      key={row.accountId}
                      className="border-b border-gray-50"
                    >
                      <td className="px-4 py-2 font-medium text-gray-900">
                        {row.emailAddress}
                      </td>
                      <td className="px-4 py-2">{row.leadCount}</td>
                      <td className="px-4 py-2">{row.activePipeline}</td>
                      <td className="px-4 py-2">{row.closedWon}</td>
                      <td className="px-4 py-2">{row.closedLost}</td>
                      <td className="px-4 py-2">
                        {row.dealValue > 0
                          ? `$${row.dealValue.toLocaleString()}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 h-48 rounded-lg border border-gray-200 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={personalEmailStats.map((s) => ({
                    name: s.emailAddress.split("@")[0],
                    leads: s.leadCount,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            </>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Stuck leads
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Yellow (warning)"
              value={stuckCounts.yellow}
              sub="No follow-up or 14+ days"
            />
            <StatCard
              label="Red (critical)"
              value={stuckCounts.red}
              sub="30+ days in stage"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

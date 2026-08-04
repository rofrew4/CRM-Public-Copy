"use client";

import { useCallback, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  CheckCheck,
  MailOpen,
  RefreshCw,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  cloneDemoState,
  contactById,
  listById,
} from "@/lib/cold-email/demo-data";
import type {
  Campaign,
  CampaignStatus,
  InboxMessage,
  SendingAccount,
} from "@/lib/cold-email/types";
import { cn } from "@/lib/utils";

type TabId = "inbox" | "campaigns" | "lists" | "accounts";

const TABS: { id: TabId; label: string }[] = [
  { id: "inbox", label: "Inbox" },
  { id: "campaigns", label: "Campaigns" },
  { id: "lists", label: "Lists" },
  { id: "accounts", label: "Accounts" },
];

const STATUS_BADGE: Record<
  CampaignStatus,
  "green" | "yellow" | "gray" | "blue"
> = {
  active: "green",
  paused: "yellow",
  draft: "gray",
  completed: "blue",
};

function DemoToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-md border border-[var(--cold-border)] bg-[var(--cold-surface-2)] px-4 py-2 text-sm text-[var(--cold-fg)] shadow-lg">
      {message}
    </div>
  );
}

function timeLabel(iso: string) {
  try {
    return format(parseISO(iso), "MMM d · h:mm a");
  } catch {
    return iso;
  }
}

function replyRate(c: Campaign) {
  if (!c.sent) return "0%";
  return `${((c.replied / c.sent) * 100).toFixed(1)}%`;
}

export function ColdEmailPage() {
  const [data, setData] = useState(() => cloneDemoState());
  const [tab, setTab] = useState<TabId>("inbox");
  const [toast, setToast] = useState<string | null>(null);
  const [inboxFilter, setInboxFilter] = useState<"all" | "unread">("all");
  const [selectedMsg, setSelectedMsg] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const demoAction = useCallback(
    (label?: string) => {
      showToast(label ?? "Demo mode — sending disabled");
    },
    [showToast]
  );

  const refresh = () => {
    setData(cloneDemoState());
    setSelectedMsg(null);
    setSelectedCampaign(null);
    setSelectedList(null);
    showToast("Demo data refreshed");
  };

  const unreadCount = data.inbox.filter((m) => m.unread).length;

  const filteredInbox = useMemo(() => {
    const list =
      inboxFilter === "unread"
        ? data.inbox.filter((m) => m.unread)
        : data.inbox;
    return [...list].sort(
      (a, b) =>
        parseISO(b.receivedAt).getTime() - parseISO(a.receivedAt).getTime()
    );
  }, [data.inbox, inboxFilter]);

  const activeMessage =
    data.inbox.find((m) => m.id === selectedMsg) ?? null;

  const activeCampaign =
    data.campaigns.find((c) => c.id === selectedCampaign) ?? null;

  const activeList = data.lists.find((l) => l.id === selectedList) ?? null;

  const markRead = (id: string, unread: boolean) => {
    setData((prev) => ({
      ...prev,
      inbox: prev.inbox.map((m) =>
        m.id === id ? { ...m, unread } : m
      ),
    }));
  };

  const markAllRead = () => {
    setData((prev) => ({
      ...prev,
      inbox: prev.inbox.map((m) => ({ ...m, unread: false })),
    }));
  };

  const toggleAccount = (
    id: string,
    field: "active" | "warmup"
  ) => {
    setData((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) =>
        a.id === id ? { ...a, [field]: !a[field] } : a
      ),
    }));
  };

  const bumpWarmup = () => {
    setData((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) =>
        a.warmup
          ? { ...a, sentToday: Math.min(a.dailyCap, a.sentToday + 1) }
          : a
      ),
    }));
    showToast("Warmup run queued (demo) — no Gmail calls");
  };

  return (
    <div className="cold-email-theme min-h-screen">
      <PageHeader
        title="Cold Email"
        description="Outbound campaigns, replies, and sending accounts"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => demoAction("Demo mode — Gmail connect disabled")}
              className="border-[var(--cold-border)] bg-[var(--cold-surface)] text-[var(--cold-fg)]"
            >
              Connect Gmail
            </Button>
            <Button
              variant="secondary"
              onClick={refresh}
              className="border-[var(--cold-border)] bg-[var(--cold-surface)] text-[var(--cold-fg)]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="px-4 pb-10 pt-4 md:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-1 border-b border-[var(--cold-border)]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setSelectedMsg(null);
                setSelectedCampaign(null);
                setSelectedList(null);
              }}
              className={cn(
                "relative -mb-px px-3 py-2 text-sm transition-colors",
                tab === t.id
                  ? "border-b-2 border-[var(--cold-accent)] font-medium text-[var(--cold-fg)]"
                  : "text-[var(--cold-muted)] hover:text-[var(--cold-fg)]"
              )}
            >
              {t.label}
              {t.id === "inbox" && unreadCount > 0 ? (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--cold-accent)] px-1 text-[10px] font-semibold text-[#3a0c16]">
                  {unreadCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === "inbox" ? (
          <InboxTab
            messages={filteredInbox}
            filter={inboxFilter}
            onFilter={setInboxFilter}
            selected={activeMessage}
            onSelect={(m) => {
              setSelectedMsg(m.id);
              if (m.unread) markRead(m.id, false);
            }}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
            onBack={() => setSelectedMsg(null)}
            campaigns={data.campaigns}
          />
        ) : null}

        {tab === "campaigns" ? (
          <CampaignsTab
            campaigns={data.campaigns}
            selected={activeCampaign}
            onSelect={setSelectedCampaign}
            onBack={() => setSelectedCampaign(null)}
            onDemo={demoAction}
          />
        ) : null}

        {tab === "lists" ? (
          <ListsTab
            lists={data.lists}
            contacts={data.contacts}
            selected={activeList}
            onSelect={setSelectedList}
            onBack={() => setSelectedList(null)}
            onDemo={demoAction}
          />
        ) : null}

        {tab === "accounts" ? (
          <AccountsTab
            accounts={data.accounts}
            warmup={data.warmup}
            onToggle={toggleAccount}
            onRunWarmup={bumpWarmup}
            onRescue={() =>
              demoAction("Spam rescue queued (demo) — no Gmail calls")
            }
            onDemo={demoAction}
          />
        ) : null}
      </div>

      <DemoToast message={toast} />
    </div>
  );
}

function InboxTab({
  messages,
  filter,
  onFilter,
  selected,
  onSelect,
  onMarkRead,
  onMarkAllRead,
  onBack,
  campaigns,
}: {
  messages: InboxMessage[];
  filter: "all" | "unread";
  onFilter: (f: "all" | "unread") => void;
  selected: InboxMessage | null;
  onSelect: (m: InboxMessage) => void;
  onMarkRead: (id: string, unread: boolean) => void;
  onMarkAllRead: () => void;
  onBack: () => void;
  campaigns: Campaign[];
}) {
  if (selected) {
    const camp = campaigns.find((c) => c.id === selected.campaignId);
    return (
      <div className="cold-light-panel rounded-lg border p-5 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to inbox
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {selected.subject}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {selected.fromName}{" "}
              <span className="text-gray-400">&lt;{selected.fromEmail}&gt;</span>
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {timeLabel(selected.receivedAt)}
              {camp ? ` · ${camp.name}` : ""}
              {selected.company ? ` · ${selected.company}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => onMarkRead(selected.id, true)}
            >
              Mark unread
            </Button>
            <Button
              variant="secondary"
              onClick={() => onMarkRead(selected.id, false)}
            >
              Mark read
            </Button>
          </div>
        </div>
        <pre className="mt-5 whitespace-pre-wrap rounded-md border border-gray-100 bg-gray-50 p-4 font-sans text-sm leading-relaxed text-gray-800">
          {selected.body}
        </pre>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-md border border-[var(--cold-border)] p-0.5">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFilter(f)}
              className={cn(
                "rounded px-2.5 py-1 text-xs capitalize",
                filter === f
                  ? "bg-[var(--cold-surface-2)] text-[var(--cold-fg)]"
                  : "text-[var(--cold-muted)]"
              )}
            >
              {f === "all" ? "All" : "Unread only"}
            </button>
          ))}
        </div>
        <Button
          variant="secondary"
          onClick={onMarkAllRead}
          className="border-[var(--cold-border)] bg-[var(--cold-surface)] text-[var(--cold-fg)]"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all read
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--cold-border)] bg-[var(--cold-surface)]">
        {messages.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--cold-muted)]">
            No messages in this filter.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--cold-border)]">
            {messages.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onSelect(m)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--cold-surface-2)]"
                >
                  <MailOpen
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      m.unread
                        ? "text-[var(--cold-accent)]"
                        : "text-[var(--cold-muted)] opacity-50"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-sm",
                          m.unread
                            ? "font-semibold text-[var(--cold-fg)]"
                            : "text-[var(--cold-fg)]"
                        )}
                      >
                        {m.fromName}
                      </span>
                      {m.unread ? (
                        <span className="rounded bg-[var(--cold-accent)]/20 px-1.5 py-px text-[10px] font-medium text-[var(--cold-accent)]">
                          Unread
                        </span>
                      ) : null}
                      <span className="ml-auto shrink-0 text-[11px] text-[var(--cold-muted)]">
                        {timeLabel(m.receivedAt)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "truncate text-sm",
                        m.unread
                          ? "text-[var(--cold-fg)]"
                          : "text-[var(--cold-muted)]"
                      )}
                    >
                      {m.subject}
                    </p>
                    <p className="truncate text-xs text-[var(--cold-muted)]">
                      {m.snippet}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CampaignsTab({
  campaigns,
  selected,
  onSelect,
  onBack,
  onDemo,
}: {
  campaigns: Campaign[];
  selected: Campaign | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  onDemo: (msg?: string) => void;
}) {
  if (selected) {
    const list = listById(selected.listId);
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs text-[var(--cold-muted)] hover:text-[var(--cold-fg)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All campaigns
        </button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[var(--cold-fg)]">
                {selected.name}
              </h2>
              <Badge variant={STATUS_BADGE[selected.status]}>
                {selected.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-[var(--cold-muted)]">
              List: {list?.name ?? "—"} · Send window{" "}
              {selected.sendWindowStart}–{selected.sendWindowEnd}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => onDemo()}
              className="border-[var(--cold-border)] bg-[var(--cold-surface)] text-[var(--cold-fg)]"
            >
              Activate
            </Button>
            <Button
              variant="secondary"
              onClick={() => onDemo("Demo mode — sync disabled")}
              className="border-[var(--cold-border)] bg-[var(--cold-surface)] text-[var(--cold-fg)]"
            >
              Sync
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ["Enrolled", selected.enrolled],
            ["Sent", selected.sent],
            ["Replied", selected.replied],
            ["Reply rate", replyRate(selected)],
          ].map(([label, value]) => (
            <div
              key={label as string}
              className="rounded-lg border border-[var(--cold-border)] bg-[var(--cold-surface)] p-3"
            >
              <p className="text-[11px] uppercase tracking-wide text-[var(--cold-muted)]">
                {label}
              </p>
              <p className="mt-1 text-xl font-semibold text-[var(--cold-fg)]">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="cold-light-panel rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-gray-900">Sequence steps</h3>
          <ol className="mt-3 space-y-3">
            {selected.steps.map((step) => (
              <li
                key={step.id}
                className="rounded-md border border-gray-200 bg-gray-50 p-3"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="font-medium text-gray-800">
                    Step {step.order}
                  </span>
                  <span>·</span>
                  <span>
                    {step.delayDays === 0
                      ? "Immediate"
                      : `+${step.delayDays} days`}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {step.subject}
                </p>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-600">
                  {step.body}
                </pre>
              </li>
            ))}
          </ol>
        </div>

        <div className="cold-light-panel overflow-hidden rounded-lg border">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Enrollments</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Step</th>
                <th className="px-4 py-2 font-medium">Last touch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {selected.enrollments.map((en) => {
                const c = contactById(en.contactId);
                return (
                  <tr key={en.id}>
                    <td className="px-4 py-2.5 text-gray-900">
                      {c
                        ? `${c.firstName} ${c.lastName}`
                        : en.contactId}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {c?.company ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 capitalize text-gray-700">
                      {en.status}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {en.stepIndex + 1}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {timeLabel(en.lastTouchedAt)}
                    </td>
                  </tr>
                );
              })}
              {selected.enrollments.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No enrollments yet (draft campaign).
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          onClick={() => onDemo("Demo mode — create campaign disabled")}
          className="bg-[var(--cold-accent)] text-[#3a0c16] hover:bg-[#f0d4bc]"
        >
          <Zap className="h-3.5 w-3.5" />
          New campaign
        </Button>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {campaigns.map((c) => {
          const list = listById(c.listId);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className="rounded-lg border border-[var(--cold-border)] bg-[var(--cold-surface)] p-4 text-left transition-colors hover:bg-[var(--cold-surface-2)]"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-[var(--cold-fg)]">{c.name}</h3>
                <Badge variant={STATUS_BADGE[c.status]}>{c.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-[var(--cold-muted)]">
                {list?.name ?? "—"} · Window {c.sendWindowStart}–
                {c.sendWindowEnd}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-semibold text-[var(--cold-fg)]">
                    {c.enrolled}
                  </p>
                  <p className="text-[10px] uppercase text-[var(--cold-muted)]">
                    Enrolled
                  </p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-[var(--cold-fg)]">
                    {c.sent}
                  </p>
                  <p className="text-[10px] uppercase text-[var(--cold-muted)]">
                    Sent
                  </p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-[var(--cold-fg)]">
                    {c.replied}
                  </p>
                  <p className="text-[10px] uppercase text-[var(--cold-muted)]">
                    Replies
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ListsTab({
  lists,
  contacts,
  selected,
  onSelect,
  onBack,
  onDemo,
}: {
  lists: ReturnType<typeof cloneDemoState>["lists"];
  contacts: ReturnType<typeof cloneDemoState>["contacts"];
  selected: ReturnType<typeof cloneDemoState>["lists"][number] | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  onDemo: (msg?: string) => void;
}) {
  if (selected) {
    const members = selected.contactIds
      .map((id) => contacts.find((c) => c.id === id))
      .filter(Boolean);

    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs text-[var(--cold-muted)] hover:text-[var(--cold-fg)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All lists
        </button>
        <div>
          <h2 className="text-lg font-semibold text-[var(--cold-fg)]">
            {selected.name}
          </h2>
          <p className="text-sm text-[var(--cold-muted)]">
            {selected.description}
          </p>
        </div>
        <div className="cold-light-panel overflow-hidden rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Title</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((c) =>
                c ? (
                  <tr key={c.id}>
                    <td className="px-4 py-2.5 text-gray-900">
                      {c.firstName} {c.lastName}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{c.email}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.company}</td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {c.title ?? "—"}
                    </td>
                  </tr>
                ) : null
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => onDemo("Demo mode — CSV upload disabled")}
          className="border-[var(--cold-border)] bg-[var(--cold-surface)] text-[var(--cold-fg)]"
        >
          Upload CSV
        </Button>
        <Button
          onClick={() => onDemo("Demo mode — create list disabled")}
          className="bg-[var(--cold-accent)] text-[#3a0c16] hover:bg-[#f0d4bc]"
        >
          New list
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {lists.map((list) => (
          <button
            key={list.id}
            type="button"
            onClick={() => onSelect(list.id)}
            className="rounded-lg border border-[var(--cold-border)] bg-[var(--cold-surface)] p-4 text-left hover:bg-[var(--cold-surface-2)]"
          >
            <h3 className="font-semibold text-[var(--cold-fg)]">{list.name}</h3>
            <p className="mt-1 text-xs text-[var(--cold-muted)] line-clamp-2">
              {list.description}
            </p>
            <p className="mt-3 text-sm text-[var(--cold-accent)]">
              {list.contactIds.length} contacts
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function AccountsTab({
  accounts,
  warmup,
  onToggle,
  onRunWarmup,
  onRescue,
  onDemo,
}: {
  accounts: SendingAccount[];
  warmup: ReturnType<typeof cloneDemoState>["warmup"];
  onToggle: (id: string, field: "active" | "warmup") => void;
  onRunWarmup: () => void;
  onRescue: () => void;
  onDemo: (msg?: string) => void;
}) {
  const warmupAccounts = accounts.filter((a) => a.warmup);
  const outboundToday = warmup.filter((w) => w.type === "outbound").length;
  const repliesToday = warmup.filter((w) => w.type === "reply").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => onDemo("Demo mode — Gmail connect disabled")}
          className="border-[var(--cold-border)] bg-[var(--cold-surface)] text-[var(--cold-fg)]"
        >
          Connect Gmail
        </Button>
        <Button
          onClick={() => onDemo("Demo mode — test send disabled")}
          className="bg-[var(--cold-accent)] text-[#3a0c16] hover:bg-[#f0d4bc]"
        >
          Test send
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--cold-border)] bg-[var(--cold-surface)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--cold-border)] text-xs uppercase text-[var(--cold-muted)]">
            <tr>
              <th className="px-4 py-2.5 font-medium">Account</th>
              <th className="px-4 py-2.5 font-medium">Daily cap</th>
              <th className="px-4 py-2.5 font-medium">Sent today</th>
              <th className="px-4 py-2.5 font-medium">Active</th>
              <th className="px-4 py-2.5 font-medium">Warmup</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--cold-border)]">
            {accounts.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--cold-fg)]">
                    {a.displayName}
                  </p>
                  <p className="text-xs text-[var(--cold-muted)]">{a.email}</p>
                </td>
                <td className="px-4 py-3 text-[var(--cold-fg)]">{a.dailyCap}</td>
                <td className="px-4 py-3 text-[var(--cold-fg)]">
                  {a.sentToday}
                  <span className="text-[var(--cold-muted)]">
                    /{a.dailyCap}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Toggle
                    on={a.active}
                    onClick={() => onToggle(a.id, "active")}
                    label="Active"
                  />
                </td>
                <td className="px-4 py-3">
                  <Toggle
                    on={a.warmup}
                    onClick={() => onToggle(a.id, "warmup")}
                    label="Warmup"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cold-light-panel rounded-lg border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Warmup panel</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Fake inter-inbox warmup activity — no Gmail API
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onRescue}>
              Rescue from spam
            </Button>
            <Button onClick={onRunWarmup}>Run warmup now</Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Warmup outbound today" value={outboundToday} />
          <Stat label="Warmup replies today" value={repliesToday} />
          <Stat label="Inboxes warming" value={warmupAccounts.length} />
        </div>

        <h4 className="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Per-inbox sent today
        </h4>
        <ul className="mt-2 space-y-1.5">
          {warmupAccounts.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
            >
              <span className="text-gray-700">{a.email}</span>
              <span className="font-medium text-gray-900">
                {a.sentToday}/{a.dailyCap}
              </span>
            </li>
          ))}
        </ul>

        <h4 className="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Recent warmup subjects
        </h4>
        <ul className="mt-2 divide-y divide-gray-100 rounded border border-gray-200">
          {warmup.map((w) => (
            <li key={w.id} className="px-3 py-2.5 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={w.type === "outbound" ? "blue" : "green"}>
                  {w.type}
                </Badge>
                <span className="font-medium text-gray-900">{w.subject}</span>
                <span className="ml-auto text-[11px] text-gray-400">
                  {timeLabel(w.at)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                {w.fromEmail} → {w.toEmail}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function Toggle({
  on,
  onClick,
  label,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative h-5 w-9 rounded-full transition-colors",
        on ? "bg-emerald-500" : "bg-[var(--cold-border)]"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
          on ? "left-4" : "left-0.5"
        )}
      />
    </button>
  );
}

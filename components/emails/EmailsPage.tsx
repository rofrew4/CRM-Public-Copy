"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type {
  EmailAccount,
  EmailAccountStatus,
  EmailInboxUse,
} from "@/lib/types";
import { EMAIL_INBOX_USES } from "@/lib/types";
import {
  INBOX_USE_BADGE_CLASS,
  INBOX_USE_LABELS,
  INBOX_USE_ROW_CLASS,
  normalizeInboxUse,
} from "@/lib/email-inbox-use";
import {
  parseDailyVolume,
  parseMonthlyCost,
  sumDailyVolume,
  sumMonthlyCost,
} from "@/lib/email-stats";
import {
  EMAIL_VOLUME_SETUP_SQL,
  isMissingDailyVolumeError,
  probeEmailVolumeSchema,
} from "@/lib/email-schema";
import {
  isWeekend,
  recordTodaySendingVolume,
  sumAccountDailyVolume,
  updateAccountDailyVolume,
} from "@/lib/email-volume";
import {
  cn,
  decodePassword,
  encodePassword,
  formatDate,
} from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

const inputClass =
  "w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400";

const volumeInputClass =
  "w-16 rounded border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400";

const emptyAccount = {
  email_address: "",
  provider: "",
  purchase_date: "",
  monthly_cost: "",
  daily_volume: "",
  status: "active" as EmailAccountStatus,
  inbox_use: "personal" as EmailInboxUse,
  password: "",
  mailreach_test_url: "",
  mailreach_score: "",
  mailreach_notes: "",
};

function accountToForm(a: EmailAccount) {
  return {
    email_address: a.email_address,
    provider: a.provider ?? "",
    purchase_date: a.purchase_date?.slice(0, 10) ?? "",
    monthly_cost: a.monthly_cost != null ? String(a.monthly_cost) : "",
    daily_volume: a.daily_volume != null ? String(a.daily_volume) : "",
    status: a.status,
    inbox_use: normalizeInboxUse(a.inbox_use),
    password: "",
    mailreach_test_url: a.mailreach_test_url ?? "",
    mailreach_score:
      a.last_mailreach_score != null ? String(a.last_mailreach_score) : "",
    mailreach_notes: a.last_mailreach_notes ?? "",
  };
}

function statusVariant(
  status: EmailAccountStatus
): "green" | "yellow" | "gray" | "red" {
  switch (status) {
    case "active":
      return "green";
    case "warming":
      return "yellow";
    case "paused":
      return "gray";
    case "dead":
      return "red";
  }
}

export function EmailsPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyAccount);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [volumeNotice, setVolumeNotice] = useState<string | null>(null);
  const [volumeSchemaReady, setVolumeSchemaReady] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  const [useFilter, setUseFilter] = useState<"all" | EmailInboxUse>("all");

  const openAddModal = () => {
    setEditingAccountId(null);
    setForm(emptyAccount);
    setSaveError(null);
    setAccountModalOpen(true);
  };

  const openEditModal = (account: EmailAccount) => {
    setEditingAccountId(account.id);
    setForm(accountToForm(account));
    setSaveError(null);
    setAccountModalOpen(true);
  };

  const closeAccountModal = () => {
    setAccountModalOpen(false);
    setEditingAccountId(null);
    setForm(emptyAccount);
    setSaveError(null);
  };

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    const schema = await probeEmailVolumeSchema();
    setVolumeSchemaReady(schema.hasDailyVolumeColumn);

    const { data, error } = await supabase
      .from("email_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      const list = data as EmailAccount[];
      setAccounts(list);
      if (schema.hasDailyVolumeColumn && schema.hasDailySendingVolumeTable) {
        const logErr = await recordTodaySendingVolume(list);
        if (logErr) setVolumeNotice(logErr);
        else setVolumeNotice(null);
      } else if (!schema.hasDailyVolumeColumn) {
        setVolumeNotice(null);
      } else {
        setVolumeNotice(
          "Daily volume history table missing — run the database setup below."
        );
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const filteredAccounts = useMemo(() => {
    let list = accounts;
    if (activeOnly) list = list.filter((a) => a.status === "active");
    if (useFilter !== "all") {
      list = list.filter((a) => normalizeInboxUse(a.inbox_use) === useFilter);
    }
    return list;
  }, [accounts, activeOnly, useFilter]);

  const emailSummary = useMemo(() => {
    const activeAccounts = accounts.filter((a) => a.status === "active");
    const cost = sumMonthlyCost(accounts);
    const volume = sumDailyVolume(activeAccounts);
    return {
      total: accounts.length,
      active: activeAccounts.length,
      activeMonthlyCost: Number.isFinite(cost) ? cost : 0,
      activeDailyVolume: Number.isFinite(volume) ? volume : 0,
    };
  }, [accounts]);

  const handleInboxUseChange = async (accountId: string, inboxUse: EmailInboxUse) => {
    const { error } = await supabase
      .from("email_accounts")
      .update({ inbox_use: inboxUse, updated_at: new Date().toISOString() })
      .eq("id", accountId);
    if (error) return;
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === accountId ? { ...a, inbox_use: inboxUse } : a
      )
    );
  };

  const toggleReveal = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const buildAccountPayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
      email_address: form.email_address.trim(),
      provider: form.provider || null,
      purchase_date: form.purchase_date || null,
      monthly_cost: form.monthly_cost
        ? parseMonthlyCost(form.monthly_cost)
        : null,
      status: form.status,
      inbox_use: form.inbox_use,
      mailreach_test_url: form.mailreach_test_url || null,
      last_mailreach_score: form.mailreach_score
        ? Number(form.mailreach_score)
        : null,
      last_mailreach_notes: form.mailreach_notes || null,
      updated_at: new Date().toISOString(),
    };
    if (volumeSchemaReady) {
      payload.daily_volume = form.daily_volume
        ? Number(form.daily_volume)
        : 0;
    }
    if (form.password) {
      // TODO: Replace base64 with proper encryption before production
      payload.password = encodePassword(form.password);
    }
    return payload;
  };

  const saveAccount = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const email = form.email_address.trim();
    if (!email) return;
    setSaving(true);
    setSaveError(null);
    const payload = buildAccountPayload();

    if (editingAccountId) {
      const account = accounts.find((a) => a.id === editingAccountId);
      const mailreachChanged =
        account &&
        ((form.mailreach_score
          ? Number(form.mailreach_score)
          : null) !== account.last_mailreach_score ||
          (form.mailreach_notes || null) !==
            (account.last_mailreach_notes || null));

      if (mailreachChanged) {
        payload.last_mailreach_test_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from("email_accounts")
        .update(payload)
        .eq("id", editingAccountId);

      setSaving(false);
      if (error) {
        if (isMissingDailyVolumeError(error.message)) {
          setVolumeSchemaReady(false);
          setSaveError(
            "Your Supabase database is missing the daily_volume column. Run the setup SQL in the banner above, then refresh this page."
          );
        } else {
          setSaveError(error.message);
        }
        return;
      }
    } else {
      if (!form.password) {
        payload.password = null;
      }
      const { error } = await supabase.from("email_accounts").insert(payload);
      setSaving(false);
      if (error) {
        if (isMissingDailyVolumeError(error.message)) {
          setVolumeSchemaReady(false);
          setSaveError(
            "Your Supabase database is missing the daily_volume column. Run the setup SQL in the banner above, then refresh this page."
          );
        } else {
          setSaveError(error.message);
        }
        return;
      }
    }

    closeAccountModal();
    void loadAccounts();
  };

  const handleVolumeBlur = async (accountId: string, raw: string) => {
    if (!volumeSchemaReady) return;
    const dailyVolume = raw === "" ? 0 : Math.max(0, Number(raw) || 0);
    const account = accounts.find((a) => a.id === accountId);
    if (!account || account.daily_volume === dailyVolume) return;

    const { accounts: updated, logError } = await updateAccountDailyVolume(
      accountId,
      dailyVolume,
      accounts
    );
    setAccounts(updated);
    if (logError) setVolumeNotice(logError);
  };

  return (
    <div>
      <PageHeader
        title="Emails"
        description={`${emailSummary.total} accounts · ${emailSummary.active} active`}
        actions={<Button onClick={openAddModal}>Add Email</Button>}
      />

      {!volumeSchemaReady && !loading ? (
        <div className="mx-8 mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">Database setup required</p>
            <p className="mt-1 text-amber-800">
              Daily volume needs a one-time SQL migration in Supabase. Open{" "}
              <a
                href={
                  process.env.NEXT_PUBLIC_SUPABASE_URL
                    ? `https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/^https?:\/\/([^.]+)\.supabase\.co\/?$/, "$1")}/sql/new`
                    : "https://supabase.com/dashboard"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                SQL Editor
              </a>
              , paste the script below, click Run, then refresh this page.
            </p>
            <pre className="mt-2 max-h-40 overflow-auto rounded border border-amber-200 bg-white p-2 font-mono text-xs text-gray-800">
              {EMAIL_VOLUME_SETUP_SQL}
            </pre>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="text-xs"
                onClick={async () => {
                  await navigator.clipboard.writeText(EMAIL_VOLUME_SETUP_SQL);
                  setSqlCopied(true);
                  setTimeout(() => setSqlCopied(false), 2000);
                }}
              >
                {sqlCopied ? "Copied" : "Copy SQL"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="text-xs"
                onClick={() => void loadAccounts()}
              >
                I ran it — refresh
              </Button>
            </div>
        </div>
      ) : volumeNotice ? (
        <p className="mx-8 mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {volumeNotice}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-8 py-3">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          Active only
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Use
          <select
            value={useFilter}
            onChange={(e) =>
              setUseFilter(e.target.value as "all" | EmailInboxUse)
            }
            className={cn(inputClass, "w-auto py-1.5")}
          >
            <option value="all">All</option>
            {EMAIL_INBOX_USES.map((u) => (
              <option key={u} value={u}>
                {INBOX_USE_LABELS[u]}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-gray-400">
          {filteredAccounts.length} of {accounts.length} accounts
        </span>
      </div>

      <div className="border-b border-gray-100 px-8 py-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Accounts
            </span>
            <p className="text-xl font-semibold text-gray-900">
              {emailSummary.total}
              <span className="ml-1 text-sm font-normal text-gray-500">
                total · {emailSummary.active} active
              </span>
            </p>
            {activeOnly || useFilter !== "all" ? (
              <p className="mt-1 text-xs text-gray-400">
                {filteredAccounts.length} shown with current filters
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Active daily volume
            </span>
            <p className="text-xl font-semibold text-gray-900">
              {emailSummary.activeDailyVolume.toLocaleString()}
              <span className="ml-1 text-sm font-normal text-gray-500">
                / day
              </span>
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Sum of active inboxes only.
              {isWeekend()
                ? " Weekends excluded from analytics."
                : ""}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Monthly cost
            </span>
            <p className="text-xl font-semibold text-gray-900">
              ${emailSummary.activeMonthlyCost.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              All {emailSummary.total} account
              {emailSummary.total === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto px-8 pb-8">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-gray-200">
              {[
                "Email Address",
                "Use",
                "Provider",
                "Purchase Date",
                "Monthly Cost",
                "Daily Volume",
                "Status",
                "Last Mailreach Score",
                "Last Tested",
                "Password",
                "Mailreach Link",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-gray-400">
                  No email accounts match these filters
                </td>
              </tr>
            ) : (
              filteredAccounts.map((a) => {
                const use = normalizeInboxUse(a.inbox_use);
                return (
                  <tr
                    key={a.id}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (
                        target.closest("button, a, input, select, label")
                      )
                        return;
                      openEditModal(a);
                    }}
                    className={cn(
                      "cursor-pointer border-b border-gray-100 hover:bg-gray-50",
                      INBOX_USE_ROW_CLASS[use]
                    )}
                  >
                    <td className="px-3 py-2.5 font-medium text-gray-900">
                      {a.email_address}
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        value={use}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          void handleInboxUseChange(
                            a.id,
                            e.target.value as EmailInboxUse
                          )
                        }
                        className={cn(
                          inputClass,
                          "w-auto py-1 text-xs",
                          INBOX_USE_BADGE_CLASS[use]
                        )}
                      >
                        {EMAIL_INBOX_USES.map((u) => (
                          <option key={u} value={u}>
                            {INBOX_USE_LABELS[u]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {a.provider || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {formatDate(a.purchase_date)}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {parseMonthlyCost(a.monthly_cost) > 0
                        ? `$${parseMonthlyCost(a.monthly_cost).toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min={0}
                        className={volumeInputClass}
                        defaultValue={parseDailyVolume(a.daily_volume)}
                        key={`${a.id}-${a.daily_volume}`}
                        onBlur={(e) =>
                          void handleVolumeBlur(a.id, e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={statusVariant(a.status)}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {a.last_mailreach_score ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {formatDate(a.last_mailreach_test_date)}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleReveal(a.id);
                        }}
                        className="cursor-pointer font-mono text-xs text-gray-600 hover:text-gray-900"
                      >
                        {revealed.has(a.id)
                          ? decodePassword(a.password)
                          : "••••••••"}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      {a.mailreach_test_url ? (
                        <a
                          href={a.mailreach_test_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:text-blue-800"
                          aria-label="Open Mailreach test"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Button
                        variant="ghost"
                        className="text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(a);
                        }}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={accountModalOpen}
        onClose={closeAccountModal}
        title={editingAccountId ? "Edit Email Account" : "Add Email"}
        wide
      >
        <form onSubmit={saveAccount}>
          {saveError ? (
            <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {saveError}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Email Address *
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                className={inputClass}
                value={form.email_address}
                onChange={(e) =>
                  setForm({ ...form, email_address: e.target.value })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Provider
              </label>
              <input
                className={inputClass}
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Status
              </label>
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as EmailAccountStatus,
                  })
                }
              >
                <option value="active">active</option>
                <option value="warming">warming</option>
                <option value="paused">paused</option>
                <option value="dead">dead</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Use
              </label>
              <select
                className={inputClass}
                value={form.inbox_use}
                onChange={(e) =>
                  setForm({
                    ...form,
                    inbox_use: e.target.value as EmailInboxUse,
                  })
                }
              >
                {EMAIL_INBOX_USES.map((u) => (
                  <option key={u} value={u}>
                    {INBOX_USE_LABELS[u]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Purchase Date
              </label>
              <input
                type="date"
                className={inputClass}
                value={form.purchase_date}
                onChange={(e) =>
                  setForm({ ...form, purchase_date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Monthly Cost
              </label>
              <input
                type="number"
                className={inputClass}
                value={form.monthly_cost}
                onChange={(e) =>
                  setForm({ ...form, monthly_cost: e.target.value })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Daily Volume
              </label>
              <input
                type="number"
                min={0}
                className={inputClass}
                placeholder="e.g. 40"
                value={form.daily_volume}
                onChange={(e) =>
                  setForm({ ...form, daily_volume: e.target.value })
                }
              />
              <p className="mt-1 text-xs text-gray-400">
                Target emails per day from this inbox
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Password
              </label>
              <input
                type="password"
                className={inputClass}
                placeholder={
                  editingAccountId ? "Leave blank to keep current" : undefined
                }
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Mailreach Test URL
              </label>
              <input
                className={inputClass}
                value={form.mailreach_test_url}
                onChange={(e) =>
                  setForm({ ...form, mailreach_test_url: e.target.value })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Mailreach Score
              </label>
              <input
                type="number"
                className={inputClass}
                value={form.mailreach_score}
                onChange={(e) =>
                  setForm({ ...form, mailreach_score: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Mailreach Notes
              </label>
              <textarea
                className={cn(inputClass, "min-h-[80px]")}
                value={form.mailreach_notes}
                onChange={(e) =>
                  setForm({ ...form, mailreach_notes: e.target.value })
                }
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={closeAccountModal}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.email_address.trim()}>
              {saving
                ? "Saving…"
                : editingAccountId
                  ? "Save Changes"
                  : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

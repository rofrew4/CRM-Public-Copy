"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { StickyNote, X } from "lucide-react";
import { cn } from "@/lib/utils";

type NoteContent = {
  title: string;
  body: string;
  points?: string[];
};

/** Bump when copy changes so previously-dismissed notes show again. */
const NOTE_VERSION = "3";

const PAGE_NOTES: { match: (path: string) => boolean; note: NoteContent }[] = [
  {
    match: (p) => p.startsWith("/todo"),
    note: {
      title: "To-do",
      body: "Your daily action list. It auto-surfaces leads that need attention and mixes in any manual tasks you add.",
      points: [
        "Follow-ups that are due or overdue",
        "Proposals and post-meeting emails to send",
        "Leads waiting on a reply",
      ],
    },
  },
  {
    match: (p) => p.startsWith("/contacts"),
    note: {
      title: "Contacts",
      body: "Your full prospect database — everyone you've sourced or imported.",
      points: [
        "Import from CSV and de-dupe by email",
        "Filter by status, vertical, or assignment",
        "Assign contacts to an outreach channel",
      ],
    },
  },
  {
    match: (p) => p.startsWith("/cold-email") || p.startsWith("/emails"),
    note: {
      title: "Cold Email",
      body: "Your outbound console — campaigns, replies, lists, and sending accounts in one place.",
      points: [
        "Inbox: replies from cold sequences",
        "Campaigns: steps, enrollments, and reply rates",
        "Accounts + warmup: manage inboxes and daily volume",
      ],
    },
  },
  {
    match: (p) => p.startsWith("/outreach"),
    note: {
      title: "Saved Replies",
      body: "Send templated emails to a batch of contacts, one at a time.",
      points: [
        "Pick a template — it fills in name and company",
        "Copy subject and body as you work each contact",
        "Save new templates on the fly",
      ],
    },
  },
  {
    match: (p) => p.startsWith("/leads"),
    note: {
      title: "Leads",
      body: "Your pipeline board — everyone who replied and is worth pursuing.",
      points: [
        "Drag cards across stages, Responded → Closed",
        "Highlighted cards need a follow-up or action",
        "Log follow-ups, no-shows, and close reasons",
      ],
    },
  },
  {
    match: (p) => p.startsWith("/analytics"),
    note: {
      title: "Analytics",
      body: "A high-level read on how outreach is performing.",
      points: [
        "Meetings booked per day and week",
        "Pipeline value and win/loss breakdown",
        "Sending volume and lead sources",
      ],
    },
  },
];

function noteForPath(path: string): NoteContent | null {
  return PAGE_NOTES.find((entry) => entry.match(path))?.note ?? null;
}

function storageKey(path: string): string {
  const base = PAGE_NOTES.find((entry) => entry.match(path));
  const slug = base?.note.title.toLowerCase() ?? path;
  return `crm-sticky-note:${slug}:v${NOTE_VERSION}`;
}

export function PageStickyNote() {
  const pathname = usePathname();
  const note = noteForPath(pathname);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!note) return;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(storageKey(pathname)) === "dismissed";
    } catch {
      dismissed = false;
    }
    setOpen(!dismissed);
  }, [pathname, note]);

  if (!note) return null;

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(storageKey(pathname), "dismissed");
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`What is the ${note.title} page for?`}
        className="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-yellow-300 bg-yellow-200 text-yellow-900 shadow-lg transition-transform hover:scale-105"
        style={{ animation: "sticky-note-pop 0.18s ease-out" }}
      >
        <StickyNote className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div
      key={pathname}
      className="fixed bottom-6 right-6 z-50 w-72 select-none"
      style={{ animation: "sticky-note-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both" }}
    >
      <div
        className={cn(
          "relative rounded-sm bg-yellow-200 px-5 pb-5 pt-6 text-yellow-950",
          "shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)]"
        )}
        style={{ transform: "rotate(-2deg)" }}
      >
        <span
          aria-hidden
          className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rounded-sm bg-yellow-100/70 shadow-sm"
          style={{ transform: "rotate(-3deg)" }}
        />
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss note"
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-yellow-800/70 transition-colors hover:bg-yellow-300/70 hover:text-yellow-950"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-base font-bold tracking-tight">{note.title}</h2>
        <p className="mt-1 text-[13px] leading-snug text-yellow-900">
          {note.body}
        </p>
        {note.points && (
          <ul className="mt-2 space-y-1 text-[12px] leading-snug text-yellow-900/90">
            {note.points.map((point) => (
              <li key={point} className="flex gap-1.5">
                <span aria-hidden className="mt-[2px]">
                  •
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[10px] uppercase tracking-wide text-yellow-800/60">
          Click ✕ to dismiss
        </p>
      </div>
    </div>
  );
}

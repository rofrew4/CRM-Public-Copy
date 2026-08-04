"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Send,
  Kanban,
  BarChart3,
  ListTodo,
  Zap,
  Menu,
  X,
} from "lucide-react";
import { TodoNavBadge } from "@/components/todo/TodoNavBadge";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/todo", label: "To-do", icon: ListTodo },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/cold-email", label: "Cold Email", icon: Zap },
  { href: "/outreach", label: "Saved Replies", icon: Send },
  { href: "/leads", label: "Leads", icon: Kanban },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-[#5c1a28] font-medium text-[#f6e8ea]"
                : "text-[#d4a8b0] hover:bg-[#5c1a28]/60 hover:text-[#f6e8ea]"
            )}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" />
            <span className="flex-1">{label}</span>
            {href === "/todo" ? <TodoNavBadge /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // If the viewport grows to desktop while the drawer is open, close it
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      {/* Mobile / tablet top bar — sidebar hidden until hamburger is tapped */}
      <header className="sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-[#7a2a3a] bg-[#3a0c16] px-3 lg:hidden">
        <button
          type="button"
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-drawer"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#f6e8ea] hover:bg-[#5c1a28] active:bg-[#5c1a28]"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold tracking-tight text-[#f6e8ea]">
          CRM
        </span>
      </header>

      {/* Desktop sidebar — only from lg up */}
      <aside className="crm-sidebar fixed left-0 top-0 z-40 hidden h-full w-60 flex-col border-r lg:flex">
        <div className="border-b border-[#7a2a3a] px-5 py-4">
          <h1 className="text-sm font-semibold tracking-tight text-[#f6e8ea]">
            CRM
          </h1>
          <p className="mt-0.5 text-[11px] text-[#d4a8b0]">Demo workspace</p>
        </div>
        <NavLinks />
      </aside>

      {/* Mobile drawer overlay + panel */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Close navigation"
          tabIndex={mobileOpen ? 0 : -1}
          className={cn(
            "absolute inset-0 bg-black/55 transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className={cn(
            "crm-sidebar absolute left-0 top-0 flex h-full w-[min(16rem,85vw)] flex-col border-r shadow-2xl transition-transform duration-200 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between border-b border-[#7a2a3a] px-4 py-3">
            <div>
              <h1 className="text-sm font-semibold text-[#f6e8ea]">CRM</h1>
              <p className="text-[11px] text-[#d4a8b0]">Demo workspace</p>
            </div>
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#f6e8ea] hover:bg-[#5c1a28]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <NavLinks onNavigate={() => setMobileOpen(false)} />
        </aside>
      </div>
    </>
  );
}

/** Left margin for main content — matches desktop sidebar. */
export const MAIN_OFFSET_CLASS = "lg:ml-60";

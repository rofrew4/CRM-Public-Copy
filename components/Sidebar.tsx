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
    <nav className="flex-1 space-y-0.5 p-3">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
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

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-[#7a2a3a] bg-[#3a0c16] px-4 md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#f6e8ea] hover:bg-[#5c1a28]"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold tracking-tight text-[#f6e8ea]">
          CRM
        </span>
      </header>

      {/* Desktop sidebar */}
      <aside className="crm-sidebar fixed left-0 top-0 z-40 hidden h-full w-60 flex-col border-r md:flex">
        <div className="border-b border-[#7a2a3a] px-5 py-4">
          <h1 className="text-sm font-semibold tracking-tight text-[#f6e8ea]">
            CRM
          </h1>
          <p className="mt-0.5 text-[11px] text-[#d4a8b0]">Demo workspace</p>
        </div>
        <NavLinks />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="crm-sidebar absolute left-0 top-0 flex h-full w-60 flex-col border-r shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#7a2a3a] px-4 py-3">
              <div>
                <h1 className="text-sm font-semibold text-[#f6e8ea]">CRM</h1>
                <p className="text-[11px] text-[#d4a8b0]">Demo workspace</p>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#f6e8ea] hover:bg-[#5c1a28]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}

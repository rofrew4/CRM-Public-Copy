"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Mail,
  Send,
  Kanban,
  BarChart3,
  ListTodo,
} from "lucide-react";
import { TodoNavBadge } from "@/components/todo/TodoNavBadge";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/todo", label: "To-do", icon: ListTodo },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/emails", label: "Emails", icon: Mail },
  { href: "/outreach", label: "Outreach", icon: Send },
  { href: "/leads", label: "Leads", icon: Kanban },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-60 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <h1 className="text-sm font-semibold tracking-tight text-gray-900">
          CRM
        </h1>
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-gray-100 font-medium text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-70" />
              <span className="flex-1">{label}</span>
              {href === "/todo" ? <TodoNavBadge /> : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ClipboardCheck,
  Workflow,
  ShieldAlert,
  BarChart3,
  FileText,
  Users,
  Shield,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { NotificationsBell } from "@/components/NotificationsBell";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assessments", label: "PIA / DPIA", icon: ClipboardCheck },
  { href: "/workflow", label: "Workflow", icon: Workflow },
  { href: "/risks", label: "Risk Register", icon: ShieldAlert },
  { href: "/compliance", label: "Compliance", icon: BarChart3 },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/users", label: "Users & Roles", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const initials = (user?.name ?? "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const roleLabel = user?.role
    ? user.role.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Member";

  return (
    <aside className="group fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-slate-100">
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white">PrivacyOps</h1>
          <p className="text-xs text-slate-400">Automation Platform</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-800"
        >
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-purple-500 text-xs font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-white">{user?.name ?? "User"}</p>
            <p className="truncate text-xs text-slate-400">{roleLabel}</p>
          </div>
          <LogOut className="h-4 w-4 flex-none text-slate-400" />
        </button>
      </div>
    </aside>
  );
}

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Privacy Operations Platform
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <NotificationsBell />
        <button className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">
          <span className="text-sm text-slate-600 dark:text-slate-300">Q3 2026</span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  GitBranch,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/market", label: "Market", icon: TrendingUp },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/pipeline", label: "Pipeline", icon: GitBranch },
  { href: "/quality", label: "Quality", icon: ShieldCheck },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "border-l-[3px] border-indigo-500 bg-gradient-to-r from-indigo-500/15 to-transparent text-white shadow-[inset_0_0_20px_rgba(99,102,241,0.08)]"
                : "border-l-[3px] border-transparent text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <item.icon className="size-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-800/80">
      <div className="flex h-16 items-center gap-2 px-6 border-b border-slate-800/80">
        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25">
          CF
        </div>
        <span className="text-lg font-bold text-white tracking-tight">
          CryptoFlow
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav />
      </div>
    </aside>
  );
}

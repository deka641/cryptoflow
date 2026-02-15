"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MonitorSmartphone, Server, Database, Globe } from "lucide-react";
import type { ReactNode } from "react";

const groups: {
  label: string;
  icon: ReactNode;
  color: string;
  badgeClass: string;
  items: string[];
}[] = [
  {
    label: "Frontend",
    icon: <MonitorSmartphone className="size-4" />,
    color: "text-cyan-400",
    badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    items: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS v4", "shadcn/ui", "Recharts 3"],
  },
  {
    label: "Backend",
    icon: <Server className="size-4" />,
    color: "text-indigo-400",
    badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    items: ["Python 3.12", "FastAPI", "SQLAlchemy 2.0", "Alembic", "Uvicorn"],
  },
  {
    label: "Data Layer",
    icon: <Database className="size-4" />,
    color: "text-violet-400",
    badgeClass: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    items: ["PostgreSQL 16", "Redis 7", "Star Schema", "Materialized Views"],
  },
  {
    label: "External APIs",
    icon: <Globe className="size-4" />,
    color: "text-emerald-400",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    items: ["CoinGecko REST", "CoinCap WebSocket"],
  },
];

export function TechStackGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {groups.map((group) => (
        <div
          key={group.label}
          className="rounded-xl border border-slate-700/40 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-4 shadow-lg shadow-black/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className={cn(group.color)}>{group.icon}</span>
            <p className="text-sm font-semibold text-white">{group.label}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((item) => (
              <Badge
                key={item}
                variant="outline"
                className={cn("text-[11px]", group.badgeClass)}
              >
                {item}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

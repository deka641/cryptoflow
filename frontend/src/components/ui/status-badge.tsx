"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  passed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  failed: "bg-red-500/15 text-red-400 border-red-500/20",
  running: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  warning: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
};

const DEFAULT_COLOR = "bg-slate-500/15 text-slate-400 border-slate-500/20";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status.toLowerCase()] ?? DEFAULT_COLOR;

  return (
    <Badge variant="outline" className={cn("capitalize", colorClass)}>
      {status}
    </Badge>
  );
}

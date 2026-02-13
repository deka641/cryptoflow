import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AccentColor = "indigo" | "emerald" | "amber" | "cyan";

const accentStyles: Record<AccentColor, { border: string; iconBg: string }> = {
  indigo: {
    border: "border-l-indigo-500",
    iconBg: "bg-indigo-500/15 text-indigo-400",
  },
  emerald: {
    border: "border-l-emerald-500",
    iconBg: "bg-emerald-500/15 text-emerald-400",
  },
  amber: {
    border: "border-l-amber-500",
    iconBg: "bg-amber-500/15 text-amber-400",
  },
  cyan: {
    border: "border-l-cyan-500",
    iconBg: "bg-cyan-500/15 text-cyan-400",
  },
};

interface KpiCardProps {
  title: string;
  value: string;
  change: number | null;
  icon: ReactNode;
  accentColor?: AccentColor;
}

export function KpiCard({ title, value, change, icon, accentColor = "indigo" }: KpiCardProps) {
  const accent = accentStyles[accentColor];

  return (
    <Card className={cn(
      "glass-card border-l-[3px] hover:shadow-xl hover:shadow-black/30 transition-all duration-300",
      accent.border
    )}>
      <CardContent className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {change !== null && (
            <p
              className={cn(
                "text-sm font-medium",
                change >= 0 ? "text-emerald-400" : "text-red-400"
              )}
            >
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)}%
            </p>
          )}
        </div>
        <div className={cn("flex size-10 items-center justify-center rounded-lg", accent.iconBg)}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

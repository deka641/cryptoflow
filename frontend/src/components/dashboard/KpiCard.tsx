import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatPercentage } from "@/lib/formatters";

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
  changeLabel?: string;
  icon: ReactNode;
  accentColor?: AccentColor;
  tooltip?: string;
  sparkline?: ReactNode;
}

export function KpiCard({ title, value, change, changeLabel, icon, accentColor = "indigo", tooltip, sparkline }: KpiCardProps) {
  const accent = accentStyles[accentColor];

  const card = (
    <Card className={cn(
      "glass-card border-l-[3px] hover:shadow-xl hover:shadow-black/30 transition-all duration-300",
      accent.border
    )}>
      <CardContent className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          <div className="flex items-center gap-2">
            {change !== null && (
              <p
                className={cn(
                  "text-sm font-medium",
                  change >= 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                {formatPercentage(change)}
                {changeLabel && <span className="ml-1 text-xs font-normal text-slate-500">{changeLabel}</span>}
              </p>
            )}
            {sparkline}
          </div>
        </div>
        <div className={cn("flex size-10 items-center justify-center rounded-lg", accent.iconBg)}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );

  if (!tooltip) return card;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={6}
        className="max-w-xs border border-slate-700/50 bg-slate-800/95 backdrop-blur-md text-slate-300 shadow-xl shadow-black/20"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

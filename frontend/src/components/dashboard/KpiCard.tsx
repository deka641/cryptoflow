import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  change: number | null;
  icon: ReactNode;
}

export function KpiCard({ title, value, change, icon }: KpiCardProps) {
  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
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
        <div className="flex size-10 items-center justify-center rounded-lg bg-slate-700/50 text-slate-400">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

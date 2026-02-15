"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Shield, TrendingDown, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskMetricsProps {
  volatility: number | null | undefined;
  maxDrawdown: number | null | undefined;
  sharpeRatio: number | null | undefined;
  loading: boolean;
}

function getVolatilityColor(v: number): string {
  if (v < 30) return "text-emerald-400";
  if (v < 60) return "text-amber-400";
  return "text-red-400";
}

function getDrawdownColor(d: number): string {
  if (d > -20) return "text-emerald-400";
  if (d > -40) return "text-amber-400";
  return "text-red-400";
}

function getSharpeInfo(s: number): { color: string; label: string } {
  if (s < 0) return { color: "text-red-400", label: "Poor" };
  if (s < 1) return { color: "text-amber-400", label: "Fair" };
  if (s < 2) return { color: "text-emerald-400", label: "Good" };
  return { color: "text-emerald-300", label: "Excellent" };
}

function MetricValue({ value, children }: { value: number | null | undefined; children: (v: number) => React.ReactNode }) {
  if (value === null || value === undefined) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-2xl font-bold text-slate-500 cursor-help">-</span>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="border border-slate-700/50 bg-slate-800/95 backdrop-blur-md text-slate-300"
        >
          No data available for this period
        </TooltipContent>
      </Tooltip>
    );
  }
  return <>{children(value)}</>;
}

export function RiskMetrics({ volatility, maxDrawdown, sharpeRatio, loading }: RiskMetricsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl bg-slate-700" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-3">Risk Metrics</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Volatility */}
        <Card className="glass-card border-l-[3px] border-l-violet-500">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
              <Shield className="size-5" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Volatility</p>
              <MetricValue value={volatility}>
                {(v) => (
                  <p className={cn("text-2xl font-bold", getVolatilityColor(v))}>
                    {v.toFixed(1)}%
                  </p>
                )}
              </MetricValue>
            </div>
          </CardContent>
        </Card>

        {/* Max Drawdown */}
        <Card className="glass-card border-l-[3px] border-l-rose-500">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
              <TrendingDown className="size-5" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Max Drawdown</p>
              <MetricValue value={maxDrawdown}>
                {(d) => (
                  <p className={cn("text-2xl font-bold", getDrawdownColor(d))}>
                    {d.toFixed(1)}%
                  </p>
                )}
              </MetricValue>
            </div>
          </CardContent>
        </Card>

        {/* Sharpe Ratio */}
        <Card className="glass-card border-l-[3px] border-l-sky-500">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
              <Target className="size-5" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Sharpe Ratio</p>
              <MetricValue value={sharpeRatio}>
                {(s) => {
                  const info = getSharpeInfo(s);
                  return (
                    <div className="flex items-baseline gap-2">
                      <p className={cn("text-2xl font-bold", info.color)}>
                        {s.toFixed(2)}
                      </p>
                      <span className={cn("text-xs font-medium", info.color)}>
                        {info.label}
                      </span>
                    </div>
                  );
                }}
              </MetricValue>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { PortfolioPerformance } from "@/types";

const PERIODS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "180d", days: 180 },
  { label: "1y", days: 365 },
];

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatUsd(value: number): string {
  if (value >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/90 backdrop-blur-md px-3 py-2 shadow-xl shadow-black/20">
      <p className="text-xs text-slate-400">
        {label
          ? new Date(label).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : ""}
      </p>
      <p className="text-sm font-semibold text-white">{formatUsd(payload[0].value)}</p>
    </div>
  );
}

interface PerformanceChartProps {
  hasHoldings: boolean;
}

export function PerformanceChart({ hasHoldings }: PerformanceChartProps) {
  const [days, setDays] = useState(30);
  const [performance, setPerformance] = useState<PortfolioPerformance | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPerformance = useCallback(async (d: number) => {
    setLoading(true);
    try {
      const data = await api.getPortfolioPerformance(d);
      setPerformance(data);
    } catch {
      setPerformance(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasHoldings) return;
    fetchPerformance(days);
  }, [days, hasHoldings, fetchPerformance]);

  if (!hasHoldings) {
    return (
      <div className="flex h-80 items-center justify-center text-slate-500">
        Add holdings to see performance history
      </div>
    );
  }

  const chartData = performance?.data_points.map((p) => ({
    timestamp: p.timestamp,
    value: p.value_usd,
  })) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {PERIODS.map((p) => (
          <Button
            key={p.days}
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2.5 text-xs",
              days === p.days
                ? "bg-indigo-500/20 text-indigo-300"
                : "text-slate-400 hover:text-white"
            )}
            onClick={() => setDays(p.days)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-80 w-full bg-slate-800" />
      ) : chartData.length === 0 ? (
        <div className="flex h-80 items-center justify-center text-slate-500">
          No performance data for this period
        </div>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTimestamp}
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={formatUsd}
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={80}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#perfGradient)"
                isAnimationActive={true}
                animationDuration={500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

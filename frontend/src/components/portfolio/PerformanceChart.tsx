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
  Line,
  ComposedChart,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { formatCurrency, formatCompactCurrency } from "@/lib/formatters";
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


const BENCHMARKS = [
  { symbol: "btc", label: "BTC", color: "#f59e0b" },
  { symbol: "eth", label: "ETH", color: "#8b5cf6" },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; dataKey: string; color: string }[];
  label?: string;
  showBenchmark: boolean;
}

function CustomTooltip({ active, payload, label, showBenchmark }: CustomTooltipProps) {
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
      {payload.map((p) => (
        <p key={p.dataKey} className="text-sm font-semibold" style={{ color: p.color || "#fff" }}>
          {p.dataKey === "value" ? "Portfolio" : p.dataKey}:{" "}
          {p.dataKey === "value" ? formatCurrency(p.value) : showBenchmark ? `${p.value.toFixed(1)}` : formatCurrency(p.value)}
        </p>
      ))}
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
  const [activeBenchmark, setActiveBenchmark] = useState<string | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<{ timestamp: string; value: number }[]>([]);

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

  const fetchBenchmark = useCallback(async (d: number, sym: string) => {
    try {
      const data = await api.getPortfolioBenchmark(d, sym);
      setBenchmarkData(data.data_points);
    } catch {
      setBenchmarkData([]);
    }
  }, []);

  useEffect(() => {
    if (!hasHoldings) return;
    fetchPerformance(days);
  }, [days, hasHoldings, fetchPerformance]);

  useEffect(() => {
    if (activeBenchmark) {
      fetchBenchmark(days, activeBenchmark);
    } else {
      setBenchmarkData([]);
    }
  }, [activeBenchmark, days, fetchBenchmark]);

  if (!hasHoldings) {
    return (
      <div className="flex h-80 items-center justify-center text-slate-500">
        Add holdings to see performance history
      </div>
    );
  }

  // Merge portfolio data with benchmark data (normalized)
  const chartData = (() => {
    const perfPoints = performance?.data_points ?? [];
    if (perfPoints.length === 0) return [];

    const baseValue = perfPoints[0].value_usd;
    const normalizedPerf = perfPoints.map((p) => ({
      timestamp: p.timestamp,
      value: p.value_usd,
      Portfolio: baseValue > 0 ? (p.value_usd / baseValue) * 100 : 100,
    }));

    if (!activeBenchmark || benchmarkData.length === 0) {
      return normalizedPerf;
    }

    // Merge benchmark into portfolio timestamps
    const benchMap = new Map(benchmarkData.map((b) => [b.timestamp, b.value]));
    const benchLabel = activeBenchmark.toUpperCase();
    let lastBench = 100;

    return normalizedPerf.map((p) => {
      const bVal = benchMap.get(p.timestamp);
      if (bVal !== undefined) lastBench = bVal;
      return { ...p, [benchLabel]: lastBench };
    });
  })();

  const showBenchmark = activeBenchmark !== null && benchmarkData.length > 0;
  const benchInfo = BENCHMARKS.find((b) => b.symbol === activeBenchmark);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
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
        <div className="flex items-center gap-1 border-l border-slate-700 pl-4">
          <span className="text-xs text-slate-500 mr-1">vs</span>
          {BENCHMARKS.map((b) => (
            <Button
              key={b.symbol}
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2.5 text-xs",
                activeBenchmark === b.symbol
                  ? "text-white"
                  : "text-slate-500 hover:text-white"
              )}
              style={activeBenchmark === b.symbol ? { backgroundColor: `${b.color}30`, color: b.color } : undefined}
              onClick={() =>
                setActiveBenchmark((prev) => (prev === b.symbol ? null : b.symbol))
              }
            >
              {b.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-80 w-full bg-slate-800" />
      ) : chartData.length === 0 ? (
        <div className="flex h-80 items-center justify-center text-slate-500">
          No performance data for this period
        </div>
      ) : showBenchmark ? (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                tickFormatter={(v: number) => `${v.toFixed(0)}`}
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={50}
                domain={["auto", "auto"]}
                label={{ value: "Base 100", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip showBenchmark={showBenchmark} />} />
              <Area
                type="monotone"
                dataKey="Portfolio"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#perfGradient)"
              />
              <Line
                type="monotone"
                dataKey={activeBenchmark!.toUpperCase()}
                stroke={benchInfo?.color ?? "#f59e0b"}
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
              />
              <defs>
                <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-2 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-indigo-500 rounded-full" />
              <span className="text-slate-400">Portfolio</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 rounded-full" style={{ backgroundColor: benchInfo?.color, borderTop: "1px dashed" }} />
              <span className="text-slate-400">{activeBenchmark?.toUpperCase()}</span>
            </span>
          </div>
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
                tickFormatter={(v: number) => formatCompactCurrency(v)}
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={80}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<CustomTooltip showBenchmark={false} />} />
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

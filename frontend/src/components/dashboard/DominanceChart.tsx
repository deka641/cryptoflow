"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { FadeIn } from "@/components/ui/fade-in";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { DominancePoint } from "@/types";

const PERIODS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
];

const COIN_COLORS: Record<string, string> = {
  BTC: "#f59e0b",
  ETH: "#6366f1",
  USDT: "#22c55e",
  BNB: "#eab308",
  SOL: "#9333ea",
  XRP: "#06b6d4",
  USDC: "#3b82f6",
  ADA: "#0ea5e9",
  DOGE: "#d97706",
  AVAX: "#ef4444",
};

const FALLBACK_COLORS = [
  "#f472b6",
  "#a78bfa",
  "#34d399",
  "#fbbf24",
  "#fb923c",
  "#60a5fa",
  "#c084fc",
  "#4ade80",
  "#f87171",
  "#38bdf8",
];

function getColorForCoin(symbol: string, index: number): string {
  return COIN_COLORS[symbol] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface FlatDataPoint {
  timestamp: string;
  [coinSymbol: string]: string | number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  // Sort by dominance descending in tooltip
  const sorted = [...payload].sort((a, b) => b.value - a.value);

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/90 backdrop-blur-md px-3 py-2 shadow-xl shadow-black/20 max-w-xs">
      <p className="text-xs text-slate-400 mb-1.5">
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
      {sorted.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-300">{entry.dataKey}</span>
          </span>
          <span className="font-medium text-white">{entry.value.toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
}

export function DominanceChart() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<DominancePoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const hasToasted = useRef(false);

  const fetchData = useCallback(async (d: number) => {
    setLoading(true);
    setError(false);
    try {
      const result = await api.getMarketDominance(d);
      setData(result);
      hasToasted.current = false;
    } catch {
      setData(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(days);
  }, [days, fetchData]);

  // Derive the list of coin symbols from the data
  const coinSymbols = useMemo(() => {
    if (!data || data.length === 0) return [];
    // Use the first data point to determine coin order (sorted by dominance desc)
    const first = data[0];
    return first.coins
      .sort((a, b) => b.dominance - a.dominance)
      .map((c) => c.symbol);
  }, [data]);

  // Flatten data for Recharts: each point has timestamp + one key per coin symbol
  const chartData: FlatDataPoint[] = useMemo(() => {
    if (!data) return [];
    return data.map((point) => {
      const flat: FlatDataPoint = { timestamp: point.timestamp };
      for (const coin of point.coins) {
        flat[coin.symbol] = coin.dominance;
      }
      return flat;
    });
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-1">
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

      {/* Chart */}
      {loading ? (
        <Skeleton className="h-80 w-full bg-slate-800" />
      ) : error ? (
        <ErrorState compact message="Failed to load dominance data" onRetry={() => fetchData(days)} />
      ) : chartData.length === 0 ? (
        <div className="flex h-80 items-center justify-center text-slate-500">
          No dominance data available
        </div>
      ) : (
        <FadeIn>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                stackOffset="expand"
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  {coinSymbols.map((symbol, i) => (
                    <linearGradient
                      key={symbol}
                      id={`dominanceGradient-${symbol}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={getColorForCoin(symbol, i)}
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="100%"
                        stopColor={getColorForCoin(symbol, i)}
                        stopOpacity={0.3}
                      />
                    </linearGradient>
                  ))}
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
                  tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                  domain={[0, 1]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }}
                  iconType="circle"
                  iconSize={8}
                />
                {coinSymbols.map((symbol, i) => (
                  <Area
                    key={symbol}
                    type="monotone"
                    dataKey={symbol}
                    stackId="dominance"
                    stroke={getColorForCoin(symbol, i)}
                    strokeWidth={1}
                    fill={`url(#dominanceGradient-${symbol})`}
                    isAnimationActive={true}
                    animationDuration={500}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </FadeIn>
      )}
    </div>
  );
}

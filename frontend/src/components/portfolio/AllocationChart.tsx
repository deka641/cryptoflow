"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { PortfolioHolding } from "@/types";

interface AllocationChartProps {
  holdings: PortfolioHolding[];
  prices: Record<string, number>;
}

const COLORS = [
  "var(--chart-1, #6366f1)",
  "var(--chart-2, #22d3ee)",
  "var(--chart-3, #f59e0b)",
  "var(--chart-4, #10b981)",
  "var(--chart-5, #f43f5e)",
  "#8b5cf6",
  "#06b6d4",
  "#eab308",
  "#14b8a6",
  "#ec4899",
];

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    notation: value >= 1_000_000 ? "compact" : "standard",
  }).format(value);
}

interface ChartEntry {
  name: string;
  symbol: string;
  value: number;
  pct: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: ChartEntry }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/90 backdrop-blur-md px-3 py-2 shadow-xl shadow-black/20">
      <p className="text-sm font-semibold text-white">{d.name} ({d.symbol})</p>
      <p className="text-sm text-slate-300">{formatUsd(d.value)}</p>
      <p className="text-xs text-slate-400">{d.pct.toFixed(1)}%</p>
    </div>
  );
}

export function AllocationChart({ holdings, prices }: AllocationChartProps) {
  const data = useMemo(() => {
    const grouped: Record<string, { name: string; symbol: string; value: number }> = {};
    for (const h of holdings) {
      const price = prices[h.coingecko_id] ?? h.current_price_usd;
      const val = price != null ? h.quantity * price : 0;
      if (grouped[h.coingecko_id]) {
        grouped[h.coingecko_id].value += val;
      } else {
        grouped[h.coingecko_id] = { name: h.name, symbol: h.symbol, value: val };
      }
    }

    const entries = Object.values(grouped).filter((e) => e.value > 0);
    entries.sort((a, b) => b.value - a.value);
    const total = entries.reduce((s, e) => s + e.value, 0);

    return entries.map((e) => ({
      name: e.name,
      symbol: e.symbol,
      value: e.value,
      pct: total > 0 ? (e.value / total) * 100 : 0,
    }));
  }, [holdings, prices]);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500 text-sm">
        No allocation data
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-4">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="85%"
              dataKey="value"
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <text
              x="50%"
              y="48%"
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-white text-lg font-bold"
            >
              {formatUsd(total)}
            </text>
            <text
              x="50%"
              y="58%"
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-slate-400 text-xs"
            >
              Total
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        {data.map((entry, i) => (
          <div key={entry.symbol} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="size-3 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-slate-300">{entry.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400">{entry.pct.toFixed(1)}%</span>
              <span className="text-white font-medium">{formatUsd(entry.value)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

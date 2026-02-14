"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import type { VolatilityEntry } from "@/types";

interface VolatilityChartProps {
  data: VolatilityEntry[];
  compact?: boolean;
}

function getVolatilityColor(volatility: number, maxVol: number): string {
  const ratio = maxVol > 0 ? volatility / maxVol : 0;
  if (ratio < 0.33) return "#34d399";
  if (ratio < 0.66) return "#fbbf24";
  return "#f87171";
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: VolatilityEntry }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/90 backdrop-blur-md px-3 py-2 shadow-xl shadow-black/20">
      <p className="text-sm font-semibold text-white">{entry.name}</p>
      <p className="text-xs text-slate-400">
        Volatility: {(entry.volatility * 100).toFixed(2)}%
      </p>
      {entry.max_drawdown !== null && (
        <p className="text-xs text-slate-400">
          Max Drawdown: {(entry.max_drawdown * 100).toFixed(2)}%
        </p>
      )}
      {entry.sharpe_ratio !== null && (
        <p className="text-xs text-slate-400">
          Sharpe Ratio: {entry.sharpe_ratio.toFixed(2)}
        </p>
      )}
    </div>
  );
}

export function VolatilityChart({ data, compact = false }: VolatilityChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        No volatility data available
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.volatility - a.volatility);
  const maxVol = sorted.length > 0 ? sorted[0].volatility : 1;

  const chartData = sorted.map((entry) => ({
    ...entry,
    displaySymbol: entry.symbol.toUpperCase(),
    displayVol: entry.volatility * 100,
  }));

  return (
    <div style={{ height: Math.max(300, chartData.length * (compact ? 28 : 40)) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
          <XAxis
            type="number"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
          />
          <YAxis
            type="category"
            dataKey="displaySymbol"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.1)" }} />
          <Bar dataKey="displayVol" radius={[0, 6, 6, 0]} barSize={compact ? 18 : 24} isAnimationActive={true} animationDuration={600}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getVolatilityColor(entry.volatility, maxVol)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#34d399" }} />
          <span>Low risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#fbbf24" }} />
          <span>Medium risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#f87171" }} />
          <span>High risk</span>
        </div>
        <span className="ml-2 text-slate-500">Relative to highest in set</span>
      </div>
    </div>
  );
}

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

interface DrawdownChartProps {
  data: VolatilityEntry[];
}

interface DrawdownPoint {
  name: string;
  symbol: string;
  displaySymbol: string;
  drawdownPct: number;
}

function getDrawdownColor(
  drawdownPct: number,
  worstDrawdown: number
): string {
  if (worstDrawdown === 0) return "#34d399";
  const ratio = drawdownPct / worstDrawdown;
  if (ratio > 0.75) return "#dc2626"; // red-600
  if (ratio > 0.5) return "#f87171"; // red-400
  if (ratio > 0.25) return "#fb923c"; // orange-400
  return "#34d399"; // emerald-400
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: DrawdownPoint }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/90 backdrop-blur-md px-3 py-2 shadow-xl shadow-black/20">
      <p className="text-sm font-semibold text-white">{entry.name}</p>
      <p className="text-xs text-slate-400">
        Max Drawdown:{" "}
        <span className="text-slate-200">
          {entry.drawdownPct.toFixed(2)}%
        </span>
      </p>
      <p className="text-xs text-slate-500 mt-1">
        Worst peak-to-trough decline in this period
      </p>
    </div>
  );
}

export function DrawdownChart({ data }: DrawdownChartProps) {
  const filtered = data.filter(
    (d) => d.max_drawdown !== null && d.max_drawdown !== 0
  );

  if (filtered.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        No drawdown data available
      </div>
    );
  }

  // Sort worst-first (most negative at top)
  const sorted = [...filtered].sort(
    (a, b) => (a.max_drawdown ?? 0) - (b.max_drawdown ?? 0)
  );

  const chartData: DrawdownPoint[] = sorted.map((d) => ({
    name: d.name,
    symbol: d.symbol,
    displaySymbol: d.symbol.toUpperCase(),
    drawdownPct: (d.max_drawdown ?? 0) * 100,
  }));

  const worstDrawdown = Math.abs(chartData[0]?.drawdownPct ?? 0);

  return (
    <div
      style={{ height: Math.max(300, chartData.length * 32) }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#334155"
            horizontal={false}
          />
          <XAxis
            type="number"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={["dataMin", 0]}
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
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
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
          />
          <Bar
            dataKey="drawdownPct"
            radius={[6, 0, 0, 6]}
            barSize={20}
            isAnimationActive={true}
            animationDuration={600}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getDrawdownColor(
                  Math.abs(entry.drawdownPct),
                  worstDrawdown
                )}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#34d399" }} />
          <span>Mild (&lt;25%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#fb923c" }} />
          <span>Moderate (25-50%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#f87171" }} />
          <span>High (50-75%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#dc2626" }} />
          <span>Severe (&gt;75%)</span>
        </div>
        <span className="ml-2 text-slate-500">Severity relative to worst coin</span>
      </div>
    </div>
  );
}

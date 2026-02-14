"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";
import type { VolatilityEntry } from "@/types";

interface RiskReturnScatterProps {
  data: VolatilityEntry[];
}

interface ScatterPoint {
  name: string;
  symbol: string;
  volatilityPct: number;
  sharpe_ratio: number;
  market_cap: number;
  max_drawdown: number | null;
  image_url: string | null;
}

function getSharpeColor(sharpe: number): string {
  if (sharpe >= 1.0) return "#34d399"; // emerald-400
  if (sharpe >= 0.5) return "#6ee7b7"; // emerald-300
  if (sharpe >= 0) return "#fbbf24"; // amber-400
  if (sharpe >= -0.5) return "#fb923c"; // orange-400
  return "#f87171"; // red-400
}

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: ScatterPoint }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/90 backdrop-blur-md px-4 py-3 shadow-xl shadow-black/20">
      <div className="flex items-center gap-2 mb-2">
        {entry.image_url && (
          <img
            src={entry.image_url}
            alt={entry.symbol}
            className="w-5 h-5 rounded-full"
          />
        )}
        <p className="text-sm font-semibold text-white">
          {entry.name}{" "}
          <span className="text-slate-400 font-normal">
            {entry.symbol.toUpperCase()}
          </span>
        </p>
      </div>
      <div className="space-y-0.5">
        <p className="text-xs text-slate-400">
          Volatility:{" "}
          <span className="text-slate-200">
            {entry.volatilityPct.toFixed(2)}%
          </span>
        </p>
        <p className="text-xs text-slate-400">
          Sharpe Ratio:{" "}
          <span className="text-slate-200">
            {entry.sharpe_ratio.toFixed(2)}
          </span>
        </p>
        {entry.max_drawdown !== null && (
          <p className="text-xs text-slate-400">
            Max Drawdown:{" "}
            <span className="text-slate-200">
              {(entry.max_drawdown * 100).toFixed(2)}%
            </span>
          </p>
        )}
        {entry.market_cap > 0 && (
          <p className="text-xs text-slate-400">
            Market Cap:{" "}
            <span className="text-slate-200">
              {formatMarketCap(entry.market_cap)}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export function RiskReturnScatter({ data }: RiskReturnScatterProps) {
  const filtered = data.filter(
    (d) =>
      d.volatility > 0 &&
      d.sharpe_ratio !== null
  );

  if (filtered.length < 2) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        Insufficient analytics data for scatter plot
      </div>
    );
  }

  const points: ScatterPoint[] = filtered.map((d) => ({
    name: d.name,
    symbol: d.symbol,
    volatilityPct: d.volatility * 100,
    sharpe_ratio: d.sharpe_ratio!,
    market_cap: d.market_cap ?? 0,
    max_drawdown: d.max_drawdown,
    image_url: d.image_url,
  }));

  return (
    <div style={{ height: 480 }} className="w-full relative">
      {/* Quadrant annotations */}
      <div className="absolute top-6 left-16 text-[10px] text-emerald-400/50 font-medium pointer-events-none z-10">
        Low Risk, High Return
      </div>
      <div className="absolute top-6 right-10 text-[10px] text-amber-400/40 font-medium pointer-events-none z-10">
        High Risk, High Return
      </div>
      <div className="absolute bottom-16 left-16 text-[10px] text-slate-500/50 font-medium pointer-events-none z-10">
        Low Risk, Negative Return
      </div>
      <div className="absolute bottom-16 right-10 text-[10px] text-red-400/40 font-medium pointer-events-none z-10">
        High Risk, Negative Return
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#334155"
          />
          <XAxis
            type="number"
            dataKey="volatilityPct"
            name="Volatility"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
            label={{
              value: "Volatility (%)",
              position: "insideBottom",
              offset: -10,
              fill: "#64748b",
              fontSize: 12,
            }}
          />
          <YAxis
            type="number"
            dataKey="sharpe_ratio"
            name="Sharpe Ratio"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => v.toFixed(1)}
            label={{
              value: "Sharpe Ratio",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              fill: "#64748b",
              fontSize: 12,
            }}
          />
          <ZAxis
            type="number"
            dataKey="market_cap"
            range={[40, 400]}
            name="Market Cap"
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ strokeDasharray: "3 3", stroke: "#64748b" }}
          />
          <ReferenceLine
            y={0}
            stroke="#64748b"
            strokeDasharray="6 4"
            label={{
              value: "Sharpe = 0",
              position: "right",
              fill: "#94a3b8",
              fontSize: 11,
            }}
          />
          <Scatter data={points} isAnimationActive={true} animationDuration={600}>
            {points.map((point, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getSharpeColor(point.sharpe_ratio)}
                fillOpacity={0.85}
                stroke={getSharpeColor(point.sharpe_ratio)}
                strokeWidth={1}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Sharpe:</span>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#f87171" }} />
            <span>&lt;-0.5</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#fb923c" }} />
            <span>-0.5–0</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#fbbf24" }} />
            <span>0–0.5</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#6ee7b7" }} />
            <span>0.5–1</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#34d399" }} />
            <span>≥1</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 border-l border-slate-700/50 pl-4">
          <svg width="10" height="10" className="text-slate-500"><circle cx="3" cy="5" r="3" fill="currentColor" /></svg>
          <svg width="18" height="12" className="text-slate-500"><circle cx="9" cy="6" r="6" fill="currentColor" /></svg>
          <span>Bubble size = market cap</span>
        </div>
      </div>
    </div>
  );
}

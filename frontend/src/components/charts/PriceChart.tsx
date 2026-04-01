"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";

interface PriceChartProps {
  data: { timestamp: string; price: number }[];
  color?: string;
  showVolatilityBands?: boolean;
}

function computeVolatilityBands(
  data: { timestamp: string; price: number }[],
  window = 20
): { timestamp: string; price: number; upperBand: number; lowerBand: number }[] {
  return data.map((point, i) => {
    const start = Math.max(0, i - window + 1);
    const windowSlice = data.slice(start, i + 1).map((d) => d.price);
    const mean = windowSlice.reduce((a, b) => a + b, 0) / windowSlice.length;
    const variance =
      windowSlice.reduce((sum, p) => sum + (p - mean) ** 2, 0) / windowSlice.length;
    const std = Math.sqrt(variance);
    return {
      timestamp: point.timestamp,
      price: point.price,
      upperBand: mean + std,
      lowerBand: mean - std,
    };
  });
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
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
      <p className="text-sm font-semibold text-white">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

export function PriceChart({ data, color = "#6366f1", showVolatilityBands = false }: PriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center text-slate-400">
        No price data available
      </div>
    );
  }

  const gradientId = `priceGradient-${color.replace("#", "")}`;
  const chartData = showVolatilityBands ? computeVolatilityBands(data) : data;

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="50%" stopColor={color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
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
            tickFormatter={(v: number) => formatCurrency(v)}
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={80}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<CustomTooltip />} />
          {showVolatilityBands && (
            <>
              <Area
                type="monotone"
                dataKey="upperBand"
                stroke="none"
                fill="#6366f1"
                fillOpacity={0.08}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="lowerBand"
                stroke="none"
                fill="#020617"
                fillOpacity={0.8}
                isAnimationActive={false}
              />
            </>
          )}
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={true}
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

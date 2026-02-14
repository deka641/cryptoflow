"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import type { OHLCVPoint } from "@/types";

interface CandlestickChartProps {
  data: OHLCVPoint[];
}

const UP_COLOR = "#34d399";
const DOWN_COLOR = "#f87171";
const UP_COLOR_DIM = "rgba(52, 211, 153, 0.15)";
const DOWN_COLOR_DIM = "rgba(248, 113, 113, 0.15)";

interface CandleData {
  date: string;
  displayDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  bodyRange: [number, number];
  isUp: boolean;
}

function prepareCandleData(raw: OHLCVPoint[]): CandleData[] {
  return raw
    .filter(
      (p) =>
        p.open != null && p.high != null && p.low != null && p.close != null
    )
    .map((p) => {
      const open = p.open!;
      const high = p.high!;
      const low = p.low!;
      const close = p.close!;
      const volume = p.volume ?? 0;
      const isUp = close >= open;
      return {
        date: p.date,
        displayDate: new Date(p.date + "T00:00:00").toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric" }
        ),
        open,
        high,
        low,
        close,
        volume,
        bodyRange: [Math.min(open, close), Math.max(open, close)] as [
          number,
          number,
        ],
        isUp,
      };
    });
}

function CandleShape(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: CandleData;
}) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  if (!payload) return null;

  const { high, low, isUp } = payload;
  const color = isUp ? UP_COLOR : DOWN_COLOR;
  const bodyMax = payload.bodyRange[1];
  const bodyMin = payload.bodyRange[0];
  const centerX = x + width / 2;

  let wickTopY = y;
  let wickBottomY = y + height;

  if (bodyMax !== bodyMin && height > 0) {
    const scale = height / (bodyMax - bodyMin);
    wickTopY = y - (high - bodyMax) * scale;
    wickBottomY = y + height + (bodyMin - low) * scale;
  }

  return (
    <g>
      <line
        x1={centerX}
        y1={wickTopY}
        x2={centerX}
        y2={y}
        stroke={color}
        strokeWidth={1}
      />
      <line
        x1={centerX}
        y1={y + height}
        x2={centerX}
        y2={wickBottomY}
        stroke={color}
        strokeWidth={1}
      />
      <rect
        x={x}
        y={y}
        width={width}
        height={Math.max(height, 1)}
        fill={color}
        stroke={color}
        strokeWidth={1}
        rx={1}
      />
    </g>
  );
}

function formatPrice(value: number): string {
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
    maximumFractionDigits: 4,
  }).format(value);
}

function formatVolume(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

interface CandleTooltipProps {
  active?: boolean;
  payload?: { payload: CandleData }[];
}

function CandleTooltip({ active, payload }: CandleTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/90 backdrop-blur-md px-3 py-2 shadow-xl shadow-black/20">
      <p className="text-xs text-slate-400 mb-1">
        {new Date(data.date + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
        <span className="text-slate-400">Open</span>
        <span className="text-white font-medium text-right">
          {formatPrice(data.open)}
        </span>
        <span className="text-slate-400">High</span>
        <span className="text-white font-medium text-right">
          {formatPrice(data.high)}
        </span>
        <span className="text-slate-400">Low</span>
        <span className="text-white font-medium text-right">
          {formatPrice(data.low)}
        </span>
        <span className="text-slate-400">Close</span>
        <span
          className={`font-medium text-right ${
            data.isUp ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {formatPrice(data.close)}
        </span>
        <span className="text-slate-400">Volume</span>
        <span className="text-white font-medium text-right">
          {formatVolume(data.volume)}
        </span>
      </div>
    </div>
  );
}

export function CandlestickChart({ data }: CandlestickChartProps) {
  const candles = useMemo(() => prepareCandleData(data), [data]);

  const { minPrice, maxPrice, pricePadding, maxVolume } = useMemo(() => {
    if (candles.length === 0)
      return { minPrice: 0, maxPrice: 1, pricePadding: 0, maxVolume: 1 };
    const allPrices = candles.flatMap((c) => [c.high, c.low]);
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const padding = (max - min) * 0.05 || max * 0.01;
    const vol = Math.max(...candles.map((c) => c.volume));
    return { minPrice: min, maxPrice: max, pricePadding: padding, maxVolume: vol };
  }, [candles]);

  if (candles.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center text-slate-500">
        No OHLCV data available
      </div>
    );
  }

  const barSize =
    candles.length > 60 ? 4 : candles.length > 30 ? 8 : 12;

  return (
    <div className="w-full">
      <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={candles}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#334155"
            vertical={false}
          />
          <XAxis
            dataKey="displayDate"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="price"
            orientation="right"
            domain={[
              minPrice - pricePadding,
              maxPrice + pricePadding,
            ]}
            tickFormatter={formatPrice}
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <YAxis
            yAxisId="volume"
            orientation="left"
            domain={[0, maxVolume * 5]}
            hide
          />
          <Tooltip content={<CandleTooltip />} />
          <Bar
            yAxisId="volume"
            dataKey="volume"
            barSize={barSize}
            isAnimationActive={false}
          >
            {candles.map((entry, index) => (
              <Cell
                key={`vol-${index}`}
                fill={entry.isUp ? UP_COLOR_DIM : DOWN_COLOR_DIM}
              />
            ))}
          </Bar>
          <Bar
            yAxisId="price"
            dataKey="bodyRange"
            shape={<CandleShape />}
            barSize={barSize}
            isAnimationActive={false}
            minPointSize={1}
          >
            {candles.map((entry, index) => (
              <Cell
                key={`candle-${index}`}
                fill={entry.isUp ? UP_COLOR : DOWN_COLOR}
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#34d399" }} />
            <span>Close &gt; Open (up)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#f87171" }} />
            <span>Close &lt; Open (down)</span>
          </div>
        </div>
        <div className="flex items-center gap-2 border-l border-slate-700/50 pl-4">
          <svg width="14" height="28" viewBox="0 0 14 28" className="shrink-0">
            <line x1="7" y1="2" x2="7" y2="8" stroke="#34d399" strokeWidth="1" />
            <line x1="7" y1="20" x2="7" y2="26" stroke="#34d399" strokeWidth="1" />
            <rect x="3" y="8" width="8" height="12" rx="1" fill="#34d399" />
          </svg>
          <div className="flex flex-col text-[10px] leading-tight text-slate-500">
            <span>Wick = High/Low range</span>
            <span>Body = Open/Close range</span>
            <span className="text-slate-600">Background bars = Volume</span>
          </div>
        </div>
      </div>
    </div>
  );
}

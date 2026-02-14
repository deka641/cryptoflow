"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

interface CoinInfo {
  coinId: number;
  symbol: string;
  name: string;
  color: string;
}

interface NormalizedChartProps {
  chartData: Record<string, number | string>[];
  coins: CoinInfo[];
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
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
  coins: CoinInfo[];
}

function CustomTooltip({ active, payload, label, coins }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const coinMap = new Map(coins.map((c) => [c.symbol.toUpperCase(), c]));

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/90 backdrop-blur-md px-3 py-2 shadow-xl shadow-black/20">
      <p className="text-xs text-slate-400 mb-1">
        {label
          ? new Date(label).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : ""}
      </p>
      <div className="space-y-0.5">
        {payload.map((entry) => {
          const coin = coinMap.get(entry.dataKey);
          return (
            <div
              key={entry.dataKey}
              className="flex items-center gap-2 text-sm"
            >
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: coin?.color || entry.color }}
              />
              <span className="text-slate-400 text-xs">
                {entry.dataKey}
              </span>
              <span className="font-semibold text-white ml-auto">
                {entry.value.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function NormalizedChart({ chartData, coins }: NormalizedChartProps) {
  if (!chartData.length || !coins.length) {
    return (
      <div className="flex h-[400px] items-center justify-center text-slate-500">
        No chart data available
      </div>
    );
  }

  return (
    <div>
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              vertical={false}
            />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTimestamp}
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={50}
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => v.toFixed(0)}
            />
            <Tooltip
              content={<CustomTooltip coins={coins} />}
            />
            <ReferenceLine
              y={100}
              stroke="#475569"
              strokeDasharray="4 4"
              label={{
                value: "Base 100",
                position: "insideTopRight",
                fill: "#475569",
                fontSize: 11,
              }}
            />
            {coins.map((coin) => (
              <Line
                key={coin.coinId}
                type="monotone"
                dataKey={coin.symbol.toUpperCase()}
                stroke={coin.color}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={true}
                animationDuration={500}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Inline legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 mt-3">
        {coins.map((coin) => (
          <div key={coin.coinId} className="flex items-center gap-1.5 text-sm">
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: coin.color }}
            />
            <span className="text-slate-300">{coin.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

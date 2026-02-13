"use client";

import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface SparklineChartProps {
  data: number[];
  color?: string;
}

export function SparklineChart({ data, color }: SparklineChartProps) {
  if (!data || data.length === 0) return null;

  const trendUp = data[data.length - 1] >= data[0];
  const lineColor = color || (trendUp ? "#34d399" : "#f87171");

  const chartData = data.map((value, index) => ({ index, value }));
  const gradientId = `sparkGradient-${lineColor.replace("#", "")}`;

  return (
    <div className="h-10 w-[120px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

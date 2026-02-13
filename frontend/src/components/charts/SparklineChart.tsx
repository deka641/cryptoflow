"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";

interface SparklineChartProps {
  data: number[];
  color?: string;
}

export function SparklineChart({ data, color }: SparklineChartProps) {
  if (!data || data.length === 0) return null;

  const trendUp = data[data.length - 1] >= data[0];
  const lineColor = color || (trendUp ? "#34d399" : "#f87171");

  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <div className="h-10 w-[120px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

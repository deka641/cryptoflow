"use client";

import { useState, useEffect, useCallback } from "react";
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
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { FadeIn } from "@/components/ui/fade-in";
import { formatCompactCurrency, formatPercentage } from "@/lib/formatters";
import type { SectorData } from "@/types";
import { TrendingUp } from "lucide-react";

interface ChartDatum extends SectorData {
  displayChange: number;
  fill: string;
}

function getBarColor(value: number): string {
  return value >= 0 ? "#34d399" : "#f87171";
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: ChartDatum }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/90 backdrop-blur-md px-3 py-2 shadow-xl shadow-black/20">
      <p className="text-sm font-semibold text-white">{entry.category}</p>
      <p className="text-xs text-slate-400">
        Avg 24h Change:{" "}
        <span className={entry.avg_change_24h >= 0 ? "text-emerald-400" : "text-red-400"}>
          {formatPercentage(entry.avg_change_24h)}
        </span>
      </p>
      <p className="text-xs text-slate-400">
        Market Cap: {formatCompactCurrency(entry.total_market_cap)}
      </p>
      <p className="text-xs text-slate-400">
        Coins: {entry.coin_count}
      </p>
    </div>
  );
}

export function SectorPerformance() {
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchSectors = useCallback(async () => {
    try {
      setError(false);
      const data = await api.getMarketSectors();
      setSectors(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSectors();
  }, [fetchSectors]);

  const chartData: ChartDatum[] = sectors.map((s) => ({
    ...s,
    displayChange: Math.round(s.avg_change_24h * 100) / 100,
    fill: getBarColor(s.avg_change_24h),
  }));

  const chartHeight = Math.max(250, chartData.length * 44);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
          <TrendingUp className="size-4 text-indigo-400" />
          Sector Performance (24h)
        </CardTitle>
        <p className="text-xs text-slate-400">
          Average 24-hour price change by category, sized by total market cap
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full bg-slate-700" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message="Failed to load sector data" onRetry={fetchSectors} compact />
        ) : chartData.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-slate-400">
            No sector data available
          </div>
        ) : (
          <FadeIn>
            <div style={{ height: chartHeight }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
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
                    dataKey="category"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={120}
                    tick={({ x, y, payload }: { x: number | string; y: number | string; payload: { value: string } }) => {
                      const sector = chartData.find((d) => d.category === payload.value);
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={-4}
                            y={0}
                            dy={-2}
                            textAnchor="end"
                            fill="#e2e8f0"
                            fontSize={11}
                            fontWeight={500}
                          >
                            {payload.value}
                          </text>
                          {sector && (
                            <text
                              x={-4}
                              y={0}
                              dy={11}
                              textAnchor="end"
                              fill="#64748b"
                              fontSize={9}
                            >
                              {formatCompactCurrency(sector.total_market_cap)} | {sector.coin_count} coins
                            </text>
                          )}
                        </g>
                      );
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.1)" }} />
                  <Bar
                    dataKey="displayChange"
                    radius={[0, 6, 6, 0]}
                    barSize={24}
                    isAnimationActive={true}
                    animationDuration={600}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#34d399" }} />
                <span>Positive 24h</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#f87171" }} />
                <span>Negative 24h</span>
              </div>
            </div>
          </FadeIn>
        )}
      </CardContent>
    </Card>
  );
}

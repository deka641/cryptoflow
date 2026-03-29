"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ChartErrorBoundary } from "@/components/ui/chart-error-boundary";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import type { PortfolioAttribution } from "@/types";

interface AttributionChartProps {
  attribution: PortfolioAttribution;
}

interface ChartEntry {
  name: string;
  symbol: string;
  contribution: number;
  return_pct: number;
  weight: number;
  current_value: number;
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
      <p className="text-sm font-semibold text-white">
        {d.name} ({d.symbol})
      </p>
      <p className="text-xs text-slate-400">
        Contribution: {formatPercentage(d.contribution)}
      </p>
      <p className="text-xs text-slate-400">
        Return: {formatPercentage(d.return_pct)}
      </p>
      <p className="text-xs text-slate-400">
        Weight: {(d.weight * 100).toFixed(1)}%
      </p>
      <p className="text-xs text-slate-400">
        Value: {formatCurrency(d.current_value)}
      </p>
    </div>
  );
}

export function AttributionChart({ attribution }: AttributionChartProps) {
  const chartData = useMemo(() => {
    const sorted = [...attribution.holdings].sort(
      (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
    );
    return sorted.slice(0, 10).map((h) => ({
      name: h.name,
      symbol: h.symbol,
      contribution: h.contribution,
      return_pct: h.return_pct,
      weight: h.weight,
      current_value: h.current_value,
    }));
  }, [attribution.holdings]);

  return (
    <div className="space-y-6">
      {/* Contribution bar chart */}
      <ChartErrorBoundary>
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-3">
            Contribution to Portfolio Return
          </h4>
          {chartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-slate-500 text-sm">
              No attribution data available
            </div>
          ) : (
            <div
              className="w-full"
              style={{ height: Math.max(200, chartData.length * 40 + 40) }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="symbol"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "rgba(148, 163, 184, 0.05)" }}
                  />
                  <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={
                          entry.contribution >= 0
                            ? "rgba(34, 197, 94, 0.7)"
                            : "rgba(239, 68, 68, 0.7)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </ChartErrorBoundary>

      {/* Sector attribution table */}
      {attribution.sectors.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-3">
            Sector Attribution
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="pb-2 text-left font-medium text-slate-400">
                    Category
                  </th>
                  <th className="pb-2 text-right font-medium text-slate-400">
                    Value
                  </th>
                  <th className="pb-2 text-right font-medium text-slate-400">
                    Contribution
                  </th>
                  <th className="pb-2 text-right font-medium text-slate-400">
                    Holdings
                  </th>
                </tr>
              </thead>
              <tbody>
                {attribution.sectors.map((sector) => (
                  <tr
                    key={sector.category}
                    className="border-b border-slate-700/30"
                  >
                    <td className="py-2.5 text-slate-300">
                      {sector.category}
                    </td>
                    <td className="py-2.5 text-right text-white font-medium">
                      {formatCurrency(sector.total_value)}
                    </td>
                    <td
                      className={`py-2.5 text-right font-medium ${
                        sector.contribution >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {formatPercentage(sector.contribution)}
                    </td>
                    <td className="py-2.5 text-right text-slate-400">
                      {sector.holding_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

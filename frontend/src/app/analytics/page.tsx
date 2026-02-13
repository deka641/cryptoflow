"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { CorrelationMatrix, VolatilityEntry } from "@/types";
import { CorrelationHeatmap } from "@/components/charts/CorrelationHeatmap";
import { VolatilityChart } from "@/components/charts/VolatilityChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const PERIODS = [
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

export default function AnalyticsPage() {
  const [correlationDays, setCorrelationDays] = useState(30);
  const [volatilityDays, setVolatilityDays] = useState(30);
  const [correlation, setCorrelation] = useState<CorrelationMatrix | null>(null);
  const [volatility, setVolatility] = useState<VolatilityEntry[] | null>(null);
  const [corrLoading, setCorrLoading] = useState(true);
  const [volLoading, setVolLoading] = useState(true);

  const fetchCorrelation = useCallback(async () => {
    try {
      setCorrLoading(true);
      const result = await api.getCorrelation(correlationDays);
      setCorrelation(result);
    } catch {
      // handle error silently
    } finally {
      setCorrLoading(false);
    }
  }, [correlationDays]);

  const fetchVolatility = useCallback(async () => {
    try {
      setVolLoading(true);
      const result = await api.getVolatility(volatilityDays);
      setVolatility(result);
    } catch {
      // handle error silently
    } finally {
      setVolLoading(false);
    }
  }, [volatilityDays]);

  useEffect(() => {
    fetchCorrelation();
  }, [fetchCorrelation]);

  useEffect(() => {
    fetchVolatility();
  }, [fetchVolatility]);

  return (
    <div className="space-y-6">
      {/* Page Intro */}
      <div>
        <h2 className="text-2xl font-bold text-white">Precomputed Analytics</h2>
        <p className="mt-1 text-sm text-slate-400">
          Quantitative analytics computed daily by our batch pipeline from historical price data stored in the star-schema warehouse.
          These precomputed metrics demonstrate the separation of real-time streaming (live prices) from heavy analytical workloads (correlation, volatility).
        </p>
      </div>

      <Tabs defaultValue="correlation">
        <TabsList className="bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm">
          <TabsTrigger value="correlation" className="data-[state=active]:bg-indigo-600/20 data-[state=active]:text-white transition-all duration-200">Correlation</TabsTrigger>
          <TabsTrigger value="volatility" className="data-[state=active]:bg-indigo-600/20 data-[state=active]:text-white transition-all duration-200">Volatility</TabsTrigger>
        </TabsList>

        <TabsContent value="correlation" className="mt-6">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">Price Correlation Matrix</CardTitle>
                <p className="text-xs text-slate-400 mt-1">
                  Pearson correlation of daily returns between the top 15 coins. Values near +1 indicate assets that move together, near -1 move inversely, and near 0 are uncorrelated.
                </p>
              </div>
              <div className="flex gap-1">
                {PERIODS.map((period) => (
                  <Button
                    key={period.days}
                    variant={correlationDays === period.days ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setCorrelationDays(period.days)}
                    className={
                      correlationDays === period.days
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "text-slate-400 hover:text-white hover:bg-slate-700"
                    }
                  >
                    {period.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {corrLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Skeleton className="h-64 w-full max-w-xl bg-slate-700" />
                </div>
              ) : correlation ? (
                <CorrelationHeatmap
                  coins={correlation.coins}
                  matrix={correlation.matrix}
                />
              ) : (
                <div className="flex h-64 items-center justify-center text-slate-500">
                  Failed to load correlation data
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volatility" className="mt-6">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">Volatility Ranking</CardTitle>
                <p className="text-xs text-slate-400 mt-1">
                  Standard deviation of daily returns — higher values mean more price fluctuation. Color-coded: green (low risk), yellow (moderate), red (high). Hover for Sharpe ratio and max drawdown.
                </p>
              </div>
              <div className="flex gap-1">
                {PERIODS.map((period) => (
                  <Button
                    key={period.days}
                    variant={volatilityDays === period.days ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setVolatilityDays(period.days)}
                    className={
                      volatilityDays === period.days
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "text-slate-400 hover:text-white hover:bg-slate-700"
                    }
                  >
                    {period.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {volLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full bg-slate-700" />
                  ))}
                </div>
              ) : volatility ? (
                <VolatilityChart data={volatility} />
              ) : (
                <div className="flex h-64 items-center justify-center text-slate-500">
                  Failed to load volatility data
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Coin, CoinHistory, CorrelationMatrix, VolatilityEntry } from "@/types";
import { CoinSelector, COIN_COLORS } from "@/components/compare/CoinSelector";
import { NormalizedChart } from "@/components/compare/NormalizedChart";
import { PerformanceTable } from "@/components/compare/PerformanceTable";
import type { CoinMetrics } from "@/components/compare/PerformanceTable";
import { PairwiseCorrelation } from "@/components/compare/PairwiseCorrelation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GitCompareArrows, TrendingUp } from "lucide-react";

const PERIODS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "180d", days: 180 },
  { label: "1y", days: 365 },
];

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-48 bg-slate-700" />
            <Skeleton className="h-4 w-96 bg-slate-700 mt-2" />
          </div>
          <Skeleton className="h-10 w-full max-w-md bg-slate-700" />
          <Skeleton className="h-[400px] w-full bg-slate-700" />
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();

  const [selectedCoins, setSelectedCoins] = useState<Coin[]>([]);
  const [periodDays, setPeriodDays] = useState(30);
  const [histories, setHistories] = useState<Map<number, CoinHistory>>(
    new Map()
  );
  const [volatilityData, setVolatilityData] = useState<
    VolatilityEntry[] | null
  >(null);
  const [correlationData, setCorrelationData] =
    useState<CorrelationMatrix | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Parse URL params on mount
  useEffect(() => {
    const coinsParam = searchParams.get("coins");
    const periodParam = searchParams.get("period");

    if (periodParam) {
      const days = parseInt(periodParam, 10);
      if (!isNaN(days) && PERIODS.some((p) => p.days === days)) {
        setPeriodDays(days);
      }
    }

    if (coinsParam) {
      const symbols = coinsParam
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (symbols.length > 0) {
        api
          .getCoins(1, 50)
          .then((res) => {
            const matched = symbols
              .map((sym) =>
                res.items.find((c) => c.symbol.toLowerCase() === sym)
              )
              .filter((c): c is Coin => c !== undefined)
              .slice(0, 5);
            if (matched.length > 0) {
              setSelectedCoins(matched);
            }
            setInitialized(true);
          })
          .catch(() => setInitialized(true));
        return;
      }
    }
    setInitialized(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch histories when selection or period changes
  const fetchHistories = useCallback(async () => {
    if (selectedCoins.length === 0) {
      setHistories(new Map());
      return;
    }
    try {
      setHistoryLoading(true);
      const results = await Promise.all(
        selectedCoins.map((c) => api.getCoinHistory(c.id, periodDays))
      );
      const map = new Map<number, CoinHistory>();
      results.forEach((r) => map.set(r.coin_id, r));
      setHistories(map);
    } catch {
      // partial failure is ok
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedCoins, periodDays]);

  // Fetch analytics (volatility + correlation)
  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      const [vol, corr] = await Promise.all([
        api.getVolatility(periodDays),
        api.getCorrelation(periodDays),
      ]);
      setVolatilityData(vol);
      setCorrelationData(corr);
    } catch {
      // silent
    } finally {
      setAnalyticsLoading(false);
    }
  }, [periodDays]);

  useEffect(() => {
    if (initialized) fetchHistories();
  }, [fetchHistories, initialized]);

  useEffect(() => {
    if (initialized) fetchAnalytics();
  }, [fetchAnalytics, initialized]);

  // Coin info with colors
  const coinInfos = useMemo(
    () =>
      selectedCoins.map((c, idx) => ({
        coinId: c.id,
        symbol: c.symbol,
        name: c.name,
        color: COIN_COLORS[idx],
      })),
    [selectedCoins]
  );

  // Normalize price data to base 100
  const chartData = useMemo(() => {
    if (selectedCoins.length < 2) return [];

    // Build a map of coin_id -> base price and normalized data
    const coinSeries: Map<
      string,
      Map<string, number>
    > = new Map();

    for (const coin of selectedCoins) {
      const history = histories.get(coin.id);
      if (!history || !history.prices.length) continue;

      const prices = history.prices.filter((p) => p.price_usd !== null);
      if (prices.length === 0) continue;

      const basePrice = prices[0].price_usd!;
      const symbolKey = coin.symbol.toUpperCase();
      const seriesMap = new Map<string, number>();

      for (const p of prices) {
        if (p.price_usd !== null) {
          seriesMap.set(p.timestamp, (p.price_usd / basePrice) * 100);
        }
      }
      coinSeries.set(symbolKey, seriesMap);
    }

    if (coinSeries.size < 2) return [];

    // Collect all unique timestamps, sorted
    const allTimestamps = new Set<string>();
    for (const series of coinSeries.values()) {
      for (const ts of series.keys()) {
        allTimestamps.add(ts);
      }
    }
    const sortedTimestamps = Array.from(allTimestamps).sort();

    // Build merged array
    return sortedTimestamps.map((ts) => {
      const point: Record<string, number | string> = { timestamp: ts };
      for (const [symbol, series] of coinSeries) {
        const val = series.get(ts);
        if (val !== undefined) {
          point[symbol] = val;
        }
      }
      return point;
    });
  }, [selectedCoins, histories]);

  // Compute metrics
  const metrics: CoinMetrics[] = useMemo(() => {
    return selectedCoins.map((coin, idx) => {
      const history = histories.get(coin.id);
      const prices = history?.prices.filter((p) => p.price_usd !== null) ?? [];
      const firstPrice = prices[0]?.price_usd ?? null;
      const lastPrice = prices[prices.length - 1]?.price_usd ?? null;

      // Return %
      const totalReturnPct =
        firstPrice && lastPrice
          ? ((lastPrice - firstPrice) / firstPrice) * 100
          : null;

      // Get server-computed values from volatility endpoint
      const volEntry = volatilityData?.find(
        (v) => v.symbol.toLowerCase() === coin.symbol.toLowerCase()
      );

      // Annualized volatility: prefer server value, fallback to client calc
      let annualizedVolatility = volEntry?.volatility ?? null;
      if (annualizedVolatility === null && prices.length > 2) {
        const logReturns: number[] = [];
        for (let i = 1; i < prices.length; i++) {
          const prev = prices[i - 1].price_usd!;
          const curr = prices[i].price_usd!;
          if (prev > 0 && curr > 0) {
            logReturns.push(Math.log(curr / prev));
          }
        }
        if (logReturns.length > 1) {
          const mean =
            logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
          const variance =
            logReturns.reduce((a, b) => a + (b - mean) ** 2, 0) /
            (logReturns.length - 1);
          annualizedVolatility = Math.sqrt(variance) * Math.sqrt(365) * 100;
        }
      }

      // Max drawdown: prefer server value, fallback to client calc
      let maxDrawdown = volEntry?.max_drawdown ?? null;
      if (maxDrawdown === null && prices.length > 1) {
        let peak = prices[0].price_usd!;
        let worstDrawdown = 0;
        for (const p of prices) {
          if (p.price_usd! > peak) peak = p.price_usd!;
          const dd = (p.price_usd! - peak) / peak;
          if (dd < worstDrawdown) worstDrawdown = dd;
        }
        maxDrawdown = worstDrawdown * 100;
      }

      // Sharpe: only from server
      const sharpeRatio = volEntry?.sharpe_ratio ?? null;

      return {
        coinId: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        imageUrl: coin.image_url,
        color: COIN_COLORS[idx],
        currentPrice: coin.price_usd,
        totalReturnPct,
        annualizedVolatility,
        maxDrawdown,
        sharpeRatio,
      };
    });
  }, [selectedCoins, histories, volatilityData]);

  return (
    <div className="space-y-6">
      {/* Page Intro */}
      <div>
        <h2 className="text-2xl font-bold text-white">Compare Coins</h2>
        <p className="mt-1 text-sm text-slate-400">
          Select up to 5 coins to compare their normalized performance, key
          metrics, and pairwise correlations side by side.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
        <CoinSelector
          selectedCoins={selectedCoins}
          onSelectionChange={setSelectedCoins}
        />
        <div className="flex gap-1">
          {PERIODS.map((period) => (
            <Button
              key={period.days}
              variant={periodDays === period.days ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriodDays(period.days)}
              className={
                periodDays === period.days
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }
            >
              {period.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {selectedCoins.length === 0 && (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <GitCompareArrows className="size-12 text-slate-600 mb-4" />
            <p className="text-lg font-medium text-slate-300">
              Select at least 2 coins to see their comparison chart and metrics.
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Use the selector above to pick coins from the top 50 by market
              cap.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Single coin hint */}
      {selectedCoins.length === 1 && (
        <Card className="glass-card">
          <CardContent className="flex items-center justify-center gap-2 py-8 text-center">
            <TrendingUp className="size-5 text-indigo-400" />
            <p className="text-sm text-slate-400">
              Select one more coin to see the comparison chart.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Normalized Performance Chart */}
      {selectedCoins.length >= 2 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white">
              Normalized Performance (Base 100)
            </CardTitle>
            <p className="text-xs text-slate-400 mt-1">
              Each coin&apos;s price is indexed to 100 at the start of the
              period. Lines above 100 indicate gains, below 100 indicate losses
              relative to the starting point.
            </p>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <Skeleton className="h-[400px] w-full bg-slate-700" />
            ) : (
              <NormalizedChart chartData={chartData} coins={coinInfos} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Performance Table */}
      {selectedCoins.length >= 1 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white">Performance Metrics</CardTitle>
            <p className="text-xs text-slate-400 mt-1">
              Key risk and return metrics for the selected period. Volatility,
              drawdown, and Sharpe ratio are computed by the analytics pipeline.
            </p>
          </CardHeader>
          <CardContent>
            {historyLoading || analyticsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: selectedCoins.length }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full bg-slate-700" />
                ))}
              </div>
            ) : (
              <PerformanceTable metrics={metrics} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Pairwise Correlation */}
      {selectedCoins.length >= 2 && correlationData && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white">Pairwise Correlation</CardTitle>
            <p className="text-xs text-slate-400 mt-1">
              Pearson correlation of daily returns between the selected coins.
              Only coins in the top 15 by market cap have precomputed
              correlation data.
            </p>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-48 w-full bg-slate-700" />
            ) : (
              <PairwiseCorrelation
                selectedSymbols={selectedCoins.map((c) => c.symbol)}
                allSymbols={correlationData.coins}
                matrix={correlationData.matrix}
                colors={selectedCoins.map((_, i) => COIN_COLORS[i])}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

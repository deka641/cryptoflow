"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CorrelatedCoin } from "@/types";
import { cn } from "@/lib/utils";

interface CorrelationInsightsProps {
  mostCorrelated: CorrelatedCoin[];
  leastCorrelated: CorrelatedCoin[];
  loading: boolean;
}

function getCorrelationColor(corr: number): string {
  if (corr >= 0.7) return "text-emerald-400";
  if (corr >= 0.3) return "text-amber-400";
  if (corr >= 0) return "text-orange-400";
  return "text-sky-400";
}

function CoinPill({ coin }: { coin: CorrelatedCoin }) {
  return (
    <Link
      href={`/coins/${coin.coin_id}`}
      className="flex items-center gap-2.5 rounded-lg bg-slate-800/40 px-3 py-2 transition-all duration-200 hover:bg-slate-700/40"
    >
      {coin.image_url ? (
        <img src={coin.image_url} alt={coin.name} className="size-6 rounded-full" />
      ) : (
        <div className="flex size-6 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300">
          {coin.symbol[0]}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{coin.name}</p>
        <p className="text-xs text-slate-400 uppercase">{coin.symbol}</p>
      </div>
      <span className={cn("text-sm font-mono font-medium", getCorrelationColor(coin.correlation))}>
        {coin.correlation >= 0 ? "+" : ""}{coin.correlation.toFixed(2)}
      </span>
    </Link>
  );
}

export function CorrelationInsights({ mostCorrelated, leastCorrelated, loading }: CorrelationInsightsProps) {
  if (loading) {
    return <Skeleton className="h-64 w-full rounded-xl bg-slate-700" />;
  }

  if (mostCorrelated.length === 0 && leastCorrelated.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-3">Correlation Insights</h2>
      <Card className="glass-card">
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Most Correlated */}
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">Most Correlated</h3>
              {mostCorrelated.length > 0 ? (
                <div className="space-y-1.5">
                  {mostCorrelated.map((coin) => (
                    <CoinPill key={coin.coin_id} coin={coin} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No correlation data available</p>
              )}
            </div>

            {/* Least Correlated */}
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">Least Correlated</h3>
              {leastCorrelated.length > 0 ? (
                <div className="space-y-1.5">
                  {leastCorrelated.map((coin) => (
                    <CoinPill key={coin.coin_id} coin={coin} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No correlation data available</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

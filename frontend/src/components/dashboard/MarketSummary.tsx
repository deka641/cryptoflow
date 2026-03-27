"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import { formatPercentage } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface SummaryCoin {
  coin_id: number;
  symbol: string;
  name: string;
  image_url: string | null;
  return_pct: number;
}

interface MarketSummaryData {
  period_days: number;
  top_performers: SummaryCoin[];
  top_losers: SummaryCoin[];
  market_cap: { current: number | null; change_pct: number | null };
  most_volatile: { symbol: string; name: string; image_url: string | null; volatility: number }[];
}

function CoinRow({ coin }: { coin: SummaryCoin }) {
  const isPositive = coin.return_pct >= 0;
  return (
    <Link
      href={`/coins/${coin.coin_id}`}
      className="flex items-center gap-2.5 py-1.5 hover:bg-slate-800/30 rounded px-1 -mx-1 transition-colors"
    >
      {coin.image_url ? (
        <Image src={coin.image_url} alt={coin.name} width={20} height={20} className="size-5 rounded-full" />
      ) : (
        <div className="size-5 rounded-full bg-slate-700" />
      )}
      <span className="text-sm text-slate-300 flex-1 truncate">{coin.symbol}</span>
      <span className={`text-sm font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
        {formatPercentage(coin.return_pct)}
      </span>
    </Link>
  );
}

export function MarketSummary() {
  const [data, setData] = useState<MarketSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getMarketSummary(7)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <Skeleton className="h-5 w-40 bg-slate-700" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-7 w-full bg-slate-700" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || (data.top_performers.length === 0 && data.top_losers.length === 0)) {
    return null;
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-white">7-Day Market Summary</CardTitle>
        <p className="text-xs text-slate-400">
          Key movers and volatility highlights from the past week, computed from historical price data.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Top Performers */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <TrendingUp className="size-4 text-emerald-400" />
              <span className="text-sm font-medium text-slate-300">Top Performers</span>
            </div>
            <div className="space-y-0.5">
              {data.top_performers.map((coin) => (
                <CoinRow key={coin.coin_id} coin={coin} />
              ))}
            </div>
          </div>

          {/* Biggest Losers */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <TrendingDown className="size-4 text-red-400" />
              <span className="text-sm font-medium text-slate-300">Biggest Losers</span>
            </div>
            <div className="space-y-0.5">
              {data.top_losers.map((coin) => (
                <CoinRow key={coin.coin_id} coin={coin} />
              ))}
            </div>
          </div>

          {/* Most Volatile */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Activity className="size-4 text-amber-400" />
              <span className="text-sm font-medium text-slate-300">Most Volatile</span>
            </div>
            <div className="space-y-0.5">
              {data.most_volatile.map((coin) => (
                <div key={coin.symbol} className="flex items-center gap-2.5 py-1.5 px-1 -mx-1">
                  {coin.image_url ? (
                    <Image src={coin.image_url} alt={coin.name} width={20} height={20} className="size-5 rounded-full" />
                  ) : (
                    <div className="size-5 rounded-full bg-slate-700" />
                  )}
                  <span className="text-sm text-slate-300 flex-1 truncate">{coin.symbol}</span>
                  <span className="text-sm font-medium text-amber-400">
                    {coin.volatility.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

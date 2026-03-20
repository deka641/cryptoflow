"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useLivePricesContext } from "@/providers/live-prices-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { Skeleton } from "@/components/ui/skeleton";
import { Star } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Coin } from "@/types";

export function WatchlistWidget() {
  const { user } = useAuth();
  const { watchlist } = useWatchlist();
  const { prices } = useLivePricesContext();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || watchlist.size === 0) {
      setCoins([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchCoins = async () => {
      setLoading(true);
      try {
        const data = await api.getCoins(1, 50);
        if (!cancelled) {
          setCoins(data.items.filter((c) => watchlist.has(c.id)));
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchCoins();
    return () => { cancelled = true; };
  }, [user, watchlist]);

  // Don't render if not logged in
  if (!user) return null;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white text-base">
          <Star className="size-4 fill-yellow-400 text-yellow-400" />
          Your Watchlist
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg bg-slate-700" />
            ))}
          </div>
        ) : coins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Star className="size-8 text-slate-600 mb-2" />
            <p className="text-sm text-slate-400">Your watchlist is empty</p>
            <p className="text-xs text-slate-500 mt-1">
              Star coins from the{" "}
              <Link href="/market" className="text-indigo-400 hover:text-indigo-300 underline-offset-2 hover:underline">
                Market page
              </Link>
              {" "}to track them here
            </p>
          </div>
        ) : (
          <FadeIn>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {coins.map((coin) => {
                const livePrice = prices[coin.coingecko_id];
                const displayPrice = livePrice ?? coin.price_usd;
                const change = coin.price_change_24h_pct;

                return (
                  <Link
                    key={coin.id}
                    href={`/coins/${coin.id}`}
                    className="flex items-center gap-3 rounded-lg bg-slate-800/50 px-3 py-2.5 hover:bg-slate-700/50 transition-colors"
                  >
                    {coin.image_url ? (
                      <Image src={coin.image_url} alt={coin.name} width={24} height={24} className="size-6 rounded-full" />
                    ) : (
                      <div className="flex size-6 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300">
                        {coin.symbol[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{coin.name}</p>
                      <p className="text-xs text-slate-400 uppercase">{coin.symbol}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-white">{formatCurrency(displayPrice)}</p>
                      <p className={cn("text-xs font-medium", change !== null && change >= 0 ? "text-emerald-400" : "text-red-400")}>
                        {formatPercentage(change)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </FadeIn>
        )}
      </CardContent>
    </Card>
  );
}

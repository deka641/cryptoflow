"use client";

import { useState, useEffect } from "react";
import { useCoins } from "@/hooks/use-market-data";
import { useLivePricesContext } from "@/providers/live-prices-provider";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";
import { MarketTable } from "@/components/market/MarketTable";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, ChevronLeft, ChevronRight, Star } from "lucide-react";

export default function MarketPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const perPage = 20;
  const { data, loading } = useCoins(page, perPage, debouncedSearch);
  const { prices } = useLivePricesContext();
  const { user } = useAuth();
  const { watchlist, toggle, isWatched } = useWatchlist();
  const [sparklines, setSparklines] = useState<Record<number, number[]>>({});
  const [sparklinesLoading, setSparklinesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch sparklines when coins load
  useEffect(() => {
    if (!data?.items.length) return;
    const coinIds = data.items.map((c) => c.id);
    let cancelled = false;
    const fetchSparklines = async () => {
      setSparklinesLoading(true);
      try {
        const result = await api.getSparklines(coinIds);
        if (cancelled) return;
        const map: Record<number, number[]> = {};
        for (const item of result) {
          map[item.coin_id] = item.prices;
        }
        setSparklines((prev) => ({ ...prev, ...map }));
      } catch {
        // ignore
      } finally {
        if (!cancelled) setSparklinesLoading(false);
      }
    };
    fetchSparklines();
    return () => { cancelled = true; };
  }, [data?.items]);

  // Filter coins for watchlist tab
  const items = data?.items;
  const watchlistCoins = items
    ? items.filter((coin) => watchlist.has(coin.id))
    : [];

  const watchlistCount = watchlist.size;

  return (
    <div className="space-y-6">
      {/* Page Intro */}
      <div>
        <h2 className="text-2xl font-bold text-white">Market Data</h2>
        <p className="mt-1 text-sm text-slate-400">
          Comprehensive overview of the top 50 cryptocurrencies ranked by market capitalization. Prices and metrics are sourced from CoinGecko
          and stored in our PostgreSQL star-schema data warehouse. Click any coin to explore its historical price chart and detailed metrics.
          Live price updates are streamed via WebSocket from CoinCap.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <Input
          placeholder="Search coins..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-indigo-500/20 transition-all duration-200"
        />
      </div>

      {/* Tabs + Market Table */}
      {user ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList variant="line" className="border-b border-slate-700 pb-0">
            <TabsTrigger value="all" className="text-slate-400 data-[state=active]:text-white">
              All Coins
            </TabsTrigger>
            <TabsTrigger value="watchlist" className="text-slate-400 data-[state=active]:text-white">
              <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
              Watchlist ({watchlistCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card className="glass-card">
              <CardContent className="p-0">
                {loading ? (
                  <div className="space-y-3 p-6">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full bg-slate-700" />
                    ))}
                  </div>
                ) : data && data.items.length > 0 ? (
                  <MarketTable
                    coins={data.items}
                    livePrices={prices}
                    sparklines={sparklines}
                    sparklinesLoading={sparklinesLoading}
                    onToggleWatchlist={toggle}
                    isWatched={isWatched}
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center text-slate-500">
                    {debouncedSearch
                      ? `No coins found matching "${debouncedSearch}"`
                      : "No coins available"}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagination */}
            {data && data.pages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-slate-400">
                  Showing {(page - 1) * perPage + 1}-
                  {Math.min(page * perPage, data.total)} of {data.total} coins
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-slate-400">
                    Page {page} of {data.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                    disabled={page >= data.pages}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="watchlist">
            <Card className="glass-card">
              <CardContent className="p-0">
                {loading ? (
                  <div className="space-y-3 p-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full bg-slate-700" />
                    ))}
                  </div>
                ) : watchlistCoins.length > 0 ? (
                  <MarketTable
                    coins={watchlistCoins}
                    livePrices={prices}
                    sparklines={sparklines}
                    sparklinesLoading={sparklinesLoading}
                    onToggleWatchlist={toggle}
                    isWatched={isWatched}
                  />
                ) : (
                  <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-500">
                    <Star className="size-8 text-slate-600" />
                    <p>Your watchlist is empty.</p>
                    <p className="text-xs text-slate-600">Star a coin to add it!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <>
          <Card className="glass-card">
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full bg-slate-700" />
                  ))}
                </div>
              ) : data && data.items.length > 0 ? (
                <MarketTable
                  coins={data.items}
                  livePrices={prices}
                  sparklines={sparklines}
                  sparklinesLoading={sparklinesLoading}
                  onToggleWatchlist={toggle}
                  isWatched={isWatched}
                />
              ) : (
                <div className="flex h-48 items-center justify-center text-slate-500">
                  {debouncedSearch
                    ? `No coins found matching "${debouncedSearch}"`
                    : "No coins available"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Showing {(page - 1) * perPage + 1}-
                {Math.min(page * perPage, data.total)} of {data.total} coins
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <span className="text-sm text-slate-400">
                  Page {page} of {data.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                  disabled={page >= data.pages}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

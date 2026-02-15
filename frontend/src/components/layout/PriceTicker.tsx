"use client";

import { useState, useSyncExternalStore, useCallback } from "react";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import { useLivePricesContext } from "@/providers/live-prices-provider";
import { useCoins } from "@/hooks/use-market-data";

const STORAGE_KEY = "cryptoflow-ticker-dismissed";

function formatTickerPrice(price: number): string {
  if (price >= 1) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(price);
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function getServerSnapshot() {
  return true; // dismissed on server to avoid hydration mismatch
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function PriceTicker() {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [localDismissed, setLocalDismissed] = useState(false);
  const { prices: livePrices } = useLivePricesContext();
  const { data } = useCoins(1, 20);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setLocalDismissed(true);
    window.dispatchEvent(new Event("storage"));
  }, []);

  if (dismissed || localDismissed || !data?.items.length) return null;

  const coins = data.items;

  const tickerItems = coins.map((coin) => {
    const livePrice = livePrices[coin.coingecko_id];
    const price = livePrice ?? coin.price_usd;
    const change = coin.price_change_24h_pct;
    const isPositive = change !== null && change >= 0;

    return (
      <span
        key={coin.id}
        className="inline-flex items-center gap-1.5 px-4 whitespace-nowrap"
      >
        {coin.image_url && (
          <img src={coin.image_url} alt="" className="size-4 rounded-full" />
        )}
        <span className="font-medium text-slate-200">{coin.symbol.toUpperCase()}</span>
        <span className="text-white">{price !== null ? formatTickerPrice(price) : "-"}</span>
        {change !== null && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              isPositive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {isPositive ? "+" : ""}
            {change.toFixed(2)}%
          </span>
        )}
      </span>
    );
  });

  return (
    <div className="hidden md:block relative border-b border-slate-700/50 bg-slate-950/50 backdrop-blur-sm overflow-hidden max-w-full">
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-slate-950/90 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-8 z-10 w-12 bg-gradient-to-l from-slate-950/90 to-transparent" />

      {/* Scrolling content */}
      <div className="inline-flex items-center h-8 text-xs animate-ticker-scroll w-max">
        <div className="flex shrink-0">
          {tickerItems}
        </div>
        <div className="flex shrink-0" aria-hidden="true">
          {tickerItems}
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute right-1 top-1/2 -translate-y-1/2 z-20 p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
        aria-label="Dismiss ticker"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

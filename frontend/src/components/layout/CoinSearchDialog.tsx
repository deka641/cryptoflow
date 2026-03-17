"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/formatters";
import { Search, Command } from "lucide-react";
import type { Coin } from "@/types";

export function CoinSearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      // Focus input after dialog animation
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.getCoins(1, 10, query.trim());
        setResults(data.items);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const navigateTo = useCallback(
    (coin: Coin) => {
      setOpen(false);
      router.push(`/coins/${coin.id}`);
    },
    [router]
  );

  // Keyboard navigation within results
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      navigateTo(results[selectedIndex]);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
      >
        <Search className="size-3.5" />
        <span>Search...</span>
        <kbd className="ml-2 inline-flex items-center gap-0.5 rounded border border-slate-600 bg-slate-700/50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
          <Command className="size-2.5" />K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 p-0 gap-0 max-w-lg [&>button]:hidden">
          <div className="flex items-center gap-3 border-b border-slate-700/50 px-4 py-3">
            <Search className="size-4 text-slate-400 shrink-0" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search coins..."
              className="border-0 bg-transparent text-white placeholder:text-slate-500 focus-visible:ring-0 p-0 h-auto"
            />
          </div>

          <div className="max-h-80 overflow-y-auto py-2">
            {loading && (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                Searching...
              </div>
            )}
            {!loading && query && results.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                No coins found
              </div>
            )}
            {!loading && !query && (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                Type to search coins...
              </div>
            )}
            {results.map((coin, index) => (
              <button
                key={coin.id}
                onClick={() => navigateTo(coin)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  index === selectedIndex
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800/50"
                }`}
              >
                {coin.image_url ? (
                  <img
                    src={coin.image_url}
                    alt={coin.name}
                    width={24}
                    height={24}
                    className="size-6 rounded-full"
                  />
                ) : (
                  <div className="flex size-6 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300">
                    {coin.symbol[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{coin.name}</p>
                  <p className="text-xs text-slate-400 uppercase">{coin.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(coin.price_usd)}</p>
                  {coin.market_cap_rank && (
                    <p className="text-xs text-slate-500">#{coin.market_cap_rank}</p>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-700/50 px-4 py-2 flex items-center gap-4 text-[10px] text-slate-500">
            <span><kbd className="rounded border border-slate-600 px-1 py-0.5">↑↓</kbd> Navigate</span>
            <span><kbd className="rounded border border-slate-600 px-1 py-0.5">↵</kbd> Open</span>
            <span><kbd className="rounded border border-slate-600 px-1 py-0.5">Esc</kbd> Close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

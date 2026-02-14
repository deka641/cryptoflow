"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, X, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Coin } from "@/types";

export const COIN_COLORS = [
  "#818cf8",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#22d3ee",
];

const MAX_COINS = 5;

interface CoinSelectorProps {
  selectedCoins: Coin[];
  onSelectionChange: (coins: Coin[]) => void;
}

export function CoinSelector({
  selectedCoins,
  onSelectionChange,
}: CoinSelectorProps) {
  const [allCoins, setAllCoins] = useState<Coin[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api
      .getCoins(1, 50)
      .then((res) => setAllCoins(res.items))
      .catch(() => {});
  }, []);

  const filteredCoins = useMemo(() => {
    if (!search.trim()) return allCoins;
    const q = search.toLowerCase();
    return allCoins.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [allCoins, search]);

  const selectedIds = new Set(selectedCoins.map((c) => c.id));
  const atMax = selectedCoins.length >= MAX_COINS;

  function toggleCoin(coin: Coin) {
    if (selectedIds.has(coin.id)) {
      onSelectionChange(selectedCoins.filter((c) => c.id !== coin.id));
    } else if (!atMax) {
      onSelectionChange([...selectedCoins, coin]);
    }
  }

  function removeCoin(coinId: number) {
    onSelectionChange(selectedCoins.filter((c) => c.id !== coinId));
  }

  return (
    <div className="flex-1 max-w-md space-y-2">
      <label className="text-sm font-medium text-slate-300">
        Select coins
      </label>

      {/* Selected coin badges */}
      {selectedCoins.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCoins.map((coin, idx) => (
            <span
              key={coin.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 border border-slate-700/50 px-2.5 py-1 text-xs font-medium text-slate-200"
            >
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: COIN_COLORS[idx] }}
              />
              {coin.symbol.toUpperCase()}
              <button
                onClick={() => removeCoin(coin.id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-slate-700 transition-colors"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between bg-slate-800/80 border border-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            <span className="text-sm">
              {selectedCoins.length === 0
                ? "Choose coins to compare..."
                : `${selectedCoins.length} of ${MAX_COINS} selected`}
            </span>
            <ChevronDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0 bg-slate-800 border-slate-700/50"
          align="start"
        >
          <div className="p-2 border-b border-slate-700/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
              <Input
                placeholder="Search by name or symbol..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-500 h-9"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredCoins.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">
                No coins found
              </div>
            ) : (
              filteredCoins.map((coin) => {
                const isSelected = selectedIds.has(coin.id);
                const isDisabled = atMax && !isSelected;
                return (
                  <button
                    key={coin.id}
                    onClick={() => toggleCoin(coin)}
                    disabled={isDisabled}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                      isSelected
                        ? "bg-indigo-600/15 text-white"
                        : "text-slate-300 hover:bg-slate-700/50 hover:text-white",
                      isDisabled && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {coin.image_url ? (
                      <img
                        src={coin.image_url}
                        alt={coin.name}
                        className="size-6 rounded-full shrink-0"
                      />
                    ) : (
                      <div className="flex size-6 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300 shrink-0">
                        {coin.symbol[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <span className="font-medium">{coin.name}</span>
                      <span className="ml-1.5 text-xs text-slate-500 uppercase">
                        {coin.symbol}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="size-4 text-indigo-400 shrink-0" />
                    )}
                    {isDisabled && (
                      <span className="text-xs text-slate-600">Max {MAX_COINS}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

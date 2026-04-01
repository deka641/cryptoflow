"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
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
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const listRef = useRef<HTMLDivElement>(null);

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

  const selectedIds = useMemo(() => new Set(selectedCoins.map((c) => c.id)), [selectedCoins]);
  const atMax = selectedCoins.length >= MAX_COINS;

  const toggleCoin = useCallback(
    (coin: Coin) => {
      if (selectedIds.has(coin.id)) {
        onSelectionChange(selectedCoins.filter((c) => c.id !== coin.id));
      } else if (!atMax) {
        onSelectionChange([...selectedCoins, coin]);
      }
    },
    [selectedIds, selectedCoins, atMax, onSelectionChange]
  );

  function removeCoin(coinId: number) {
    onSelectionChange(selectedCoins.filter((c) => c.id !== coinId));
  }

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setHighlightedIndex(-1);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (filteredCoins.length === 0) return;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev >= filteredCoins.length - 1 ? 0 : prev + 1
          );
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev <= 0 ? filteredCoins.length - 1 : prev - 1
          );
          break;
        }
        case "Enter": {
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filteredCoins.length) {
            const coin = filteredCoins[highlightedIndex];
            const isDisabled = atMax && !selectedIds.has(coin.id);
            if (!isDisabled) {
              toggleCoin(coin);
            }
          }
          break;
        }
        default:
          break;
      }
    },
    [filteredCoins, highlightedIndex, atMax, selectedIds, toggleCoin]
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const item = listRef.current.querySelector(
      `[data-coin-index="${highlightedIndex}"]`
    );
    if (item) {
      item.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

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
                aria-label={`Remove ${coin.symbol || coin.name}`}
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
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Search by name or symbol..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-8 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-400 h-9"
                role="combobox"
                aria-expanded={true}
                aria-controls="coin-selector-listbox"
                aria-activedescendant={
                  highlightedIndex >= 0
                    ? `coin-option-${filteredCoins[highlightedIndex]?.id}`
                    : undefined
                }
              />
            </div>
            <span className="text-xs text-slate-600 mt-1 block">Arrow keys to navigate, Enter to select</span>
          </div>
          <div ref={listRef} className="max-h-64 overflow-y-auto p-1" id="coin-selector-listbox" role="listbox">
            {filteredCoins.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-400">
                No coins found
              </div>
            ) : (
              filteredCoins.map((coin, idx) => {
                const isSelected = selectedIds.has(coin.id);
                const isDisabled = atMax && !isSelected;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={coin.id}
                    id={`coin-option-${coin.id}`}
                    data-coin-index={idx}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggleCoin(coin)}
                    disabled={isDisabled}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                      isSelected
                        ? "bg-indigo-600/15 text-white"
                        : "text-slate-300 hover:bg-slate-700/50 hover:text-white",
                      isHighlighted && !isSelected && "bg-slate-700",
                      isHighlighted && isSelected && "ring-1 ring-slate-500",
                      isDisabled && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {coin.image_url ? (
                      <Image
                        src={coin.image_url}
                        alt={coin.name}
                        width={24}
                        height={24}
                        className="size-6 rounded-full shrink-0"
                      />
                    ) : (
                      <div className="flex size-6 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300 shrink-0">
                        {coin.symbol[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <span className="font-medium">{coin.name}</span>
                      <span className="ml-1.5 text-xs text-slate-400 uppercase">
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

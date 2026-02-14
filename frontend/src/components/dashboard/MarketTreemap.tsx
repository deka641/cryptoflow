"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Treemap } from "recharts";
import { useRouter } from "next/navigation";
import type { Coin } from "@/types";

interface MarketTreemapProps {
  coins: Coin[];
  livePrices: Record<string, number>;
}

interface TreemapNode {
  name: string;
  symbol: string;
  coinId: number;
  coingeckoId: string;
  size: number;
  price: number;
  change: number;
  marketCap: number;
}

function getChangeColor(change: number): string {
  // Clamp to [-10, 10] for color mapping
  const clamped = Math.max(-10, Math.min(10, change));
  const t = (clamped + 10) / 20; // 0 at -10%, 0.5 at 0%, 1 at +10%

  if (t <= 0.5) {
    // rose-700 (#be123c) -> slate-700 (#334155)
    const s = t / 0.5;
    const r = Math.round(0xbe + (0x33 - 0xbe) * s);
    const g = Math.round(0x12 + (0x41 - 0x12) * s);
    const b = Math.round(0x3c + (0x55 - 0x3c) * s);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // slate-700 (#334155) -> emerald-600 (#059669)
    const s = (t - 0.5) / 0.5;
    const r = Math.round(0x33 + (0x05 - 0x33) * s);
    const g = Math.round(0x41 + (0x96 - 0x41) * s);
    const b = Math.round(0x55 + (0x69 - 0x55) * s);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

function formatPrice(price: number): string {
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
    maximumFractionDigits: 6,
  }).format(price);
}

function formatMarketCap(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

interface CustomTileProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  symbol: string;
  price: number;
  change: number;
  coinId: number;
  depth: number;
  onHover: (e: React.MouseEvent, node: TreemapNode | null) => void;
  onClick: (coinId: number) => void;
}

function CustomTile({
  x,
  y,
  width,
  height,
  name,
  symbol,
  price,
  change,
  coinId,
  depth,
  onHover,
  onClick,
}: CustomTileProps) {
  if (depth !== 1) return null;

  const showPrice = width > 70 && height > 50;
  const showChange = width > 55 && height > 65;
  const showSymbol = width > 30 && height > 20;

  const symbolFontSize = Math.min(14, width / 5, height / 4);
  const priceFontSize = Math.min(11, width / 7);
  const changeFontSize = Math.min(10, width / 8);

  const node: TreemapNode = {
    name,
    symbol,
    coinId,
    coingeckoId: "",
    size: 0,
    price,
    change,
    marketCap: 0,
  };

  return (
    <g
      onMouseEnter={(e) => onHover(e, node)}
      onMouseMove={(e) => onHover(e, node)}
      onMouseLeave={(e) => onHover(e, null)}
      onClick={() => onClick(coinId)}
      style={{ cursor: "pointer" }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={getChangeColor(change)}
        stroke="rgba(15,23,42,0.6)"
        strokeWidth={2}
        rx={4}
        ry={4}
      />
      {showSymbol && (
        <text
          x={x + width / 2}
          y={y + height / 2 + (showPrice ? -8 : 0) + (showChange ? -4 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#f1f5f9"
          fontSize={symbolFontSize}
          fontWeight="bold"
          style={{ pointerEvents: "none" }}
        >
          {symbol.toUpperCase()}
        </text>
      )}
      {showPrice && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 6 + (showChange ? -4 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#cbd5e1"
          fontSize={priceFontSize}
          style={{ pointerEvents: "none" }}
        >
          {formatPrice(price)}
        </text>
      )}
      {showChange && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 20}
          textAnchor="middle"
          dominantBaseline="central"
          fill={change >= 0 ? "#6ee7b7" : "#fda4af"}
          fontSize={changeFontSize}
          fontWeight="600"
          style={{ pointerEvents: "none" }}
        >
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)}%
        </text>
      )}
    </g>
  );
}

export function MarketTreemap({ coins, livePrices }: MarketTreemapProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [tooltip, setTooltip] = useState<{
    node: TreemapNode;
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const height = Math.round(Math.min(600, Math.max(400, width * 0.55)));

  const treemapData = useMemo(() => {
    return coins
      .filter((c) => c.market_cap && c.market_cap > 0)
      .map((coin) => {
        const livePrice = livePrices[coin.coingecko_id];
        return {
          name: coin.name,
          symbol: coin.symbol,
          coinId: coin.id,
          coingeckoId: coin.coingecko_id,
          size: coin.market_cap!,
          price: livePrice ?? coin.price_usd ?? 0,
          change: coin.price_change_24h_pct ?? 0,
          marketCap: coin.market_cap!,
        };
      })
      .sort((a, b) => b.size - a.size);
  }, [coins, livePrices]);

  const handleHover = useCallback(
    (_e: React.MouseEvent, node: TreemapNode | null) => {
      if (!node) {
        setTooltip(null);
        return;
      }
      // Find the full node data from treemapData for accurate marketCap
      const fullNode = treemapData.find((n) => n.coinId === node.coinId);
      setTooltip({
        node: fullNode ?? node,
      });
    },
    [treemapData]
  );

  const handleClick = useCallback(
    (coinId: number) => {
      router.push(`/coins/${coinId}`);
    },
    [router]
  );

  if (!coins.length) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        No market data available
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {width > 0 && (
        <Treemap
          width={width}
          height={height}
          data={treemapData}
          dataKey="size"
          aspectRatio={1}
          isAnimationActive={false}
          content={
            <CustomTile
              x={0}
              y={0}
              width={0}
              height={0}
              name=""
              symbol=""
              price={0}
              change={0}
              coinId={0}
              depth={0}
              onHover={handleHover}
              onClick={handleClick}
            />
          }
        />
      )}

      {/* Tooltip — centered within the treemap */}
      {tooltip && (
        <div
          className="absolute left-1/2 top-3 z-50 -translate-x-1/2 rounded-lg border border-slate-700/50 bg-slate-800/95 backdrop-blur-md px-4 py-2.5 shadow-xl shadow-black/30 pointer-events-none"
        >
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs text-slate-400">{tooltip.node.name}</p>
              <p className="text-sm font-semibold text-white">
                {formatPrice(tooltip.node.price)}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`text-sm font-semibold ${
                  tooltip.node.change >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {tooltip.node.change >= 0 ? "+" : ""}
                {tooltip.node.change.toFixed(2)}%
              </span>
              <p className="text-xs text-slate-400">
                MCap {formatMarketCap(tooltip.node.marketCap)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-slate-400">
        <span>-10%</span>
        <div
          className="h-3 w-36 rounded"
          style={{
            background:
              "linear-gradient(to right, #be123c, #334155, #059669)",
          }}
        />
        <span>+10%</span>
        <span className="ml-3 text-slate-500">Size = Market Cap</span>
      </div>
    </div>
  );
}

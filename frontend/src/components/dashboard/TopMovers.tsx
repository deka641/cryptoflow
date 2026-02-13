import type { CoinMover } from "@/types";
import { cn } from "@/lib/utils";

interface TopMoversProps {
  title: string;
  movers: CoinMover[];
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

export function TopMovers({ movers }: TopMoversProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {movers.slice(0, 5).map((mover, index) => (
          <div
            key={mover.id}
            className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2.5 cursor-default transition-all duration-200 hover:bg-slate-700/40"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center rounded-full bg-slate-700/60 text-xs font-bold text-slate-400">
                {index + 1}
              </span>
              {mover.image_url ? (
                <img
                  src={mover.image_url}
                  alt={mover.name}
                  className="size-6 rounded-full"
                />
              ) : (
                <div className="flex size-6 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300">
                  {mover.symbol[0]}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-white">{mover.name}</p>
                <p className="text-xs text-slate-400 uppercase">
                  {mover.symbol}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white">
                {formatPrice(mover.price_usd)}
              </p>
              <p
                className={cn(
                  "text-xs font-medium",
                  mover.price_change_24h_pct >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                )}
              >
                {mover.price_change_24h_pct >= 0 ? "+" : ""}
                {mover.price_change_24h_pct.toFixed(2)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

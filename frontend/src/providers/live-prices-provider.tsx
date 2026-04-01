"use client";

import { createContext, useContext, useEffect } from "react";
import { toast } from "sonner";
import { useLivePrices } from "@/hooks/use-live-prices";
import { formatCurrency } from "@/lib/formatters";

interface LivePricesContextValue {
  prices: Record<string, number>;
  connected: boolean;
  stale: boolean;
}

const LivePricesContext = createContext<LivePricesContextValue>({
  prices: {},
  connected: false,
  stale: false,
});

export function LivePricesProvider({ children }: { children: React.ReactNode }) {
  const { prices, connected, stale, onAlertTriggered } = useLivePrices();

  useEffect(() => {
    onAlertTriggered((event) => {
      const verb = event.direction === "above" ? "rose above" : "fell below";
      toast.success(
        `${event.symbol.toUpperCase()} ${verb} ${formatCurrency(event.target_price)} (now ${formatCurrency(event.current_price)})`,
        { duration: 10000 }
      );
    });
  }, [onAlertTriggered]);

  return (
    <LivePricesContext.Provider value={{ prices, connected, stale }}>
      {children}
    </LivePricesContext.Provider>
  );
}

export function useLivePricesContext() {
  return useContext(LivePricesContext);
}

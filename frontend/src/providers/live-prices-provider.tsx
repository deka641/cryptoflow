"use client";

import { createContext, useContext } from "react";
import { useLivePrices } from "@/hooks/use-live-prices";

interface LivePricesContextValue {
  prices: Record<string, number>;
  connected: boolean;
}

const LivePricesContext = createContext<LivePricesContextValue>({
  prices: {},
  connected: false,
});

export function LivePricesProvider({ children }: { children: React.ReactNode }) {
  const value = useLivePrices();
  return (
    <LivePricesContext.Provider value={value}>
      {children}
    </LivePricesContext.Provider>
  );
}

export function useLivePricesContext() {
  return useContext(LivePricesContext);
}

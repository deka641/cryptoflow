import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Market",
  description: "Live cryptocurrency market data with prices, 24h changes, sparkline charts, market cap, and volume for the top 50 coins.",
};

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return children;
}

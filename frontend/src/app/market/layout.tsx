import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Market Data",
  description: "Live market data for the top 50 cryptocurrencies by market cap, with search, sorting, and real-time price updates.",
};

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coin Detail",
  description: "Detailed cryptocurrency analysis with price charts, risk metrics, correlation insights, and historical data.",
};

export default function CoinDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}

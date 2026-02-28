import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Track your crypto holdings with real-time P&L, allocation charts, and performance history.",
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return children;
}

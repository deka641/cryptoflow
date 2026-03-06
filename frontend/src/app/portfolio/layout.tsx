import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Track your cryptocurrency portfolio with real-time valuations, profit/loss tracking, performance charts, and benchmark comparisons.",
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return children;
}

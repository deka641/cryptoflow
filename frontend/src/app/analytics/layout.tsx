import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Quantitative analytics including correlation heatmaps, volatility rankings, Sharpe ratios, and risk-return scatter plots.",
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

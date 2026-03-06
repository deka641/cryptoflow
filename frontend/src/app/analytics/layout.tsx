import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Quantitative cryptocurrency analytics including correlation matrices, volatility analysis, and risk-return scatter plots.",
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

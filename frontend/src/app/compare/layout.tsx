import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Coins",
  description: "Compare up to 5 cryptocurrencies side by side with normalized performance charts, metrics, and pairwise correlations.",
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}

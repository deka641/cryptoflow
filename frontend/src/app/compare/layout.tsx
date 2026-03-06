import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare",
  description: "Compare cryptocurrency performance side-by-side with normalized price charts, key metrics, and historical analysis.",
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}

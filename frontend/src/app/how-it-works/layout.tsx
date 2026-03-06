import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works",
  description: "Technical architecture overview of CryptoFlow including the data pipeline, star schema, real-time streaming, and analytics engine.",
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return children;
}

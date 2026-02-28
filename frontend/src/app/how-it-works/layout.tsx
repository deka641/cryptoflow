import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works",
  description: "Interactive architecture documentation showing CryptoFlow's data pipeline, star schema, and real-time streaming infrastructure.",
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return children;
}

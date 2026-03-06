import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pipeline",
  description: "Monitor the CryptoFlow data pipeline with job run history, success rates, processing times, and real-time status.",
};

export default function PipelineLayout({ children }: { children: React.ReactNode }) {
  return children;
}

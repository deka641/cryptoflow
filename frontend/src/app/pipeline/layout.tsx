import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pipeline Monitor",
  description: "Operational dashboard for data pipeline health, job execution history, and data freshness monitoring.",
};

export default function PipelineLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Quality",
  description: "Automated data quality monitoring with freshness, completeness, schema validation, and anomaly detection checks.",
};

export default function QualityLayout({ children }: { children: React.ReactNode }) {
  return children;
}

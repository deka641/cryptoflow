import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Price Alerts",
  description:
    "Manage your cryptocurrency price alerts. Get notified when coins reach your target prices.",
  openGraph: {
    title: "Price Alerts",
    description:
      "Set and manage price alerts for your tracked cryptocurrencies on CryptoFlow.",
  },
};

export default function AlertsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import type { Metadata } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${API_BASE}/api/v1/coins/${id}`, { next: { revalidate: 300 } });
    if (res.ok) {
      const coin = await res.json();
      return {
        title: `${coin.name} (${coin.symbol.toUpperCase()})`,
        description: `Live price, charts, risk metrics, and analytics for ${coin.name} (${coin.symbol.toUpperCase()}).`,
      };
    }
  } catch {
    // Fall through to default
  }
  return {
    title: "Coin Detail",
    description: "Detailed cryptocurrency analysis with price charts, risk metrics, correlation insights, and historical data.",
  };
}

export default function CoinDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}

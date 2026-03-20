import type { Metadata } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getCoinData(id: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/coins/${id}`, { next: { revalidate: 300 } });
    if (res.ok) return res.json();
  } catch (err) {
    console.warn(`[SEO] Failed to fetch coin data for ${id}:`, err);
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const coin = await getCoinData(id);
  if (coin) {
    return {
      title: `${coin.name} (${coin.symbol.toUpperCase()})`,
      description: `Live price, charts, risk metrics, and analytics for ${coin.name} (${coin.symbol.toUpperCase()}).`,
    };
  }
  return {
    title: "Coin Detail",
    description: "Detailed cryptocurrency analysis with price charts, risk metrics, correlation insights, and historical data.",
  };
}

export default async function CoinDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const coin = await getCoinData(id);

  const jsonLd = coin
    ? {
        "@context": "https://schema.org",
        "@type": "ExchangeRateSpecification",
        name: `${coin.name} (${coin.symbol.toUpperCase()})`,
        currency: coin.symbol.toUpperCase(),
        currentExchangeRate: {
          "@type": "UnitPriceSpecification",
          price: coin.price_usd,
          priceCurrency: "USD",
        },
        url: `https://cryptoflow.deka-labs.dev/coins/${id}`,
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}

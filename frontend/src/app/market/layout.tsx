import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Market",
  description: "Live cryptocurrency market data with prices, 24h changes, sparkline charts, market cap, and volume for the top 50 coins.",
  openGraph: {
    title: "Market Data",
    description: "Browse and filter the top 50 cryptocurrencies by market cap, price, volume, and 24h change.",
  },
};

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DataCatalog",
    "name": "CryptoFlow Market Data",
    "description": "Real-time market data for top 50 cryptocurrencies including prices, market cap, and trading volume",
    "url": "https://cryptoflow.deka-labs.dev/market",
    "provider": {
      "@type": "Organization",
      "name": "CryptoFlow",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}

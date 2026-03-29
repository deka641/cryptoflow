import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Documentation",
  description:
    "CryptoFlow public REST API documentation with endpoints, examples, and rate limits.",
  openGraph: {
    title: "API Documentation",
    description: "CryptoFlow public REST API documentation.",
  },
};

export default function ApiDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebAPI",
    "name": "CryptoFlow Public API",
    "description": "Free, unauthenticated API for cryptocurrency market data, analytics, and correlation metrics",
    "url": "https://cryptoflow.deka-labs.dev/api-docs",
    "documentation": "https://cryptoflow.deka-labs.dev/api/docs",
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

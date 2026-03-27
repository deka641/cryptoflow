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
  return children;
}

import type { MetadataRoute } from "next";

const BASE_URL = "https://cryptoflow.deka-labs.dev";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "hourly", priority: 1 },
    { url: `${BASE_URL}/market`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/analytics`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/pipeline`, lastModified: new Date(), changeFrequency: "daily", priority: 0.5 },
    { url: `${BASE_URL}/quality`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.5 },
    { url: `${BASE_URL}/compare`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/how-it-works`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  // Dynamic coin routes
  let coinRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_BASE}/api/v1/coins?page=1&per_page=50`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      coinRoutes = data.items.map((coin: { id: number }) => ({
        url: `${BASE_URL}/coins/${coin.id}`,
        lastModified: new Date(),
        changeFrequency: "hourly" as const,
        priority: 0.7,
      }));
    }
  } catch {
    // Fallback: no dynamic routes if API is unavailable
  }

  return [...staticRoutes, ...coinRoutes];
}

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/market", "/analytics", "/pipeline", "/quality", "/compare", "/how-it-works", "/coins/"],
        disallow: ["/auth/", "/portfolio", "/profile", "/api/"],
      },
    ],
    sitemap: "https://cryptoflow.deka-labs.dev/sitemap.xml",
  };
}

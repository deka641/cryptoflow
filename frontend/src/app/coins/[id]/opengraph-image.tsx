import { ImageResponse } from "next/og";

export const runtime = "edge";
export const revalidate = 300;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function formatPrice(price: number): string {
  if (price >= 1) {
    return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function formatChange(change: number): string {
  const sign = change >= 0 ? "+" : "";
  return sign + change.toFixed(2) + "%";
}

function formatMarketCap(value: number): string {
  if (value >= 1e12) return "$" + (value / 1e12).toFixed(2) + "T";
  if (value >= 1e9) return "$" + (value / 1e9).toFixed(2) + "B";
  if (value >= 1e6) return "$" + (value / 1e6).toFixed(2) + "M";
  return "$" + value.toLocaleString("en-US");
}

interface CoinData {
  id: number;
  coingecko_id: string;
  symbol: string;
  name: string;
  category: string | null;
  market_cap_rank: number | null;
  price_usd: number | null;
  market_cap: number | null;
  total_volume: number | null;
  price_change_24h_pct: number | null;
  circulating_supply: number | null;
}

export default async function OGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  let coin: CoinData | null = null;
  try {
    const res = await fetch(`${apiUrl}/api/v1/public/coins/${id}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      coin = await res.json();
    }
  } catch {
    // Fall through to fallback image
  }

  // Fallback: generic CryptoFlow OG image when data is unavailable
  if (!coin) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "#020617",
            background: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "64px",
                height: "64px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              }}
            >
              <span style={{ fontSize: "36px", color: "white", fontWeight: 700 }}>C</span>
            </div>
            <span style={{ fontSize: "48px", fontWeight: 700, color: "#f1f5f9" }}>
              CryptoFlow
            </span>
          </div>
          <span style={{ fontSize: "28px", color: "#94a3b8" }}>
            Real-Time Crypto Analytics
          </span>
        </div>
      ),
      { ...size }
    );
  }

  const change = coin.price_change_24h_pct ?? 0;
  const isPositive = change >= 0;
  const changeColor = isPositive ? "#22c55e" : "#ef4444";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#020617",
          background: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)",
          padding: "60px",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {/* Top row: branding */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              }}
            >
              <span style={{ fontSize: "24px", color: "white", fontWeight: 700 }}>C</span>
            </div>
            <span style={{ fontSize: "24px", fontWeight: 600, color: "#94a3b8" }}>
              CryptoFlow
            </span>
          </div>
          {coin.market_cap_rank != null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 20px",
                borderRadius: "9999px",
                backgroundColor: "rgba(148, 163, 184, 0.1)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
              }}
            >
              <span style={{ fontSize: "20px", color: "#94a3b8", fontWeight: 500 }}>
                Rank #{coin.market_cap_rank}
              </span>
            </div>
          )}
        </div>

        {/* Center: coin info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            marginBottom: "auto",
          }}
        >
          {/* Coin name and symbol */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "16px", marginBottom: "16px" }}>
            <span style={{ fontSize: "56px", fontWeight: 700, color: "#f1f5f9" }}>
              {coin.name}
            </span>
            <span style={{ fontSize: "32px", fontWeight: 500, color: "#64748b" }}>
              {coin.symbol.toUpperCase()}
            </span>
          </div>

          {/* Price and 24h change */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            {coin.price_usd != null && (
              <span style={{ fontSize: "64px", fontWeight: 700, color: "#f8fafc" }}>
                {formatPrice(coin.price_usd)}
              </span>
            )}
            {coin.price_change_24h_pct != null && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 20px",
                  borderRadius: "12px",
                  backgroundColor: isPositive ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                }}
              >
                <span style={{ fontSize: "32px", fontWeight: 600, color: changeColor }}>
                  {isPositive ? "\u25B2" : "\u25BC"} {formatChange(change)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom stats row */}
        <div
          style={{
            display: "flex",
            gap: "48px",
            borderTop: "1px solid rgba(148, 163, 184, 0.15)",
            paddingTop: "28px",
          }}
        >
          {coin.market_cap != null && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "16px", color: "#64748b", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Market Cap
              </span>
              <span style={{ fontSize: "28px", fontWeight: 600, color: "#cbd5e1" }}>
                {formatMarketCap(coin.market_cap)}
              </span>
            </div>
          )}
          {coin.total_volume != null && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "16px", color: "#64748b", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                24h Volume
              </span>
              <span style={{ fontSize: "28px", fontWeight: 600, color: "#cbd5e1" }}>
                {formatMarketCap(coin.total_volume)}
              </span>
            </div>
          )}
          {coin.category && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "16px", color: "#64748b", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Category
              </span>
              <span style={{ fontSize: "28px", fontWeight: 600, color: "#cbd5e1" }}>
                {coin.category}
              </span>
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}

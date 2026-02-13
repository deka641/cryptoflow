#!/usr/bin/env python3
"""
Seed script: Loads top 50 coins + 90 days of historical data from CoinGecko.
Run from project root: source .venv/bin/activate && python scripts/seed_data.py
"""
import sys
import time
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import httpx
import psycopg2
from datetime import datetime, timezone

DB_URL = "postgresql://cryptoflow:cryptoflow123@localhost:5432/cryptoflow"
COINGECKO_BASE = "https://api.coingecko.com/api/v3"


def api_get(endpoint: str, params: dict | None = None, retries: int = 3):
    """Rate-limited CoinGecko API call."""
    url = f"{COINGECKO_BASE}{endpoint}"
    for attempt in range(retries):
        try:
            with httpx.Client(timeout=30) as client:
                resp = client.get(url, params=params)
                if resp.status_code == 429:
                    wait = 2 ** (attempt + 1) * 15
                    print(f"  Rate limited, waiting {wait}s...")
                    time.sleep(wait)
                    continue
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            if attempt == retries - 1:
                print(f"  ERROR: {e}")
                return None
            time.sleep(5)
    return None


def seed_coins(conn):
    """Fetch top 50 coins and insert into dim_coin."""
    print("\n[1/3] Fetching top 50 coins from CoinGecko...")
    data = api_get("/coins/markets", {
        "vs_currency": "usd",
        "order": "market_cap_desc",
        "per_page": 50,
        "page": 1,
        "sparkline": "false",
    })

    if not data:
        print("  Failed to fetch coins!")
        return []

    cur = conn.cursor()
    coins = []
    for coin in data:
        cur.execute("""
            INSERT INTO dim_coin (coingecko_id, symbol, name, category, image_url, market_cap_rank)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (coingecko_id) DO UPDATE SET
                symbol = EXCLUDED.symbol,
                name = EXCLUDED.name,
                image_url = EXCLUDED.image_url,
                market_cap_rank = EXCLUDED.market_cap_rank,
                updated_at = NOW()
            RETURNING id, coingecko_id
        """, (
            coin["id"], coin["symbol"], coin["name"],
            None, coin.get("image"), coin.get("market_cap_rank"),
        ))
        row = cur.fetchone()
        coins.append({"db_id": row[0], "coingecko_id": row[1], "data": coin})

    # Insert current market snapshot
    now = datetime.now(timezone.utc)
    for c in coins:
        d = c["data"]
        cur.execute("""
            INSERT INTO fact_market_data
                (coin_id, timestamp, price_usd, market_cap, total_volume, price_change_24h_pct, circulating_supply)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (coin_id, timestamp) DO NOTHING
        """, (
            c["db_id"], now, d.get("current_price"), d.get("market_cap"),
            d.get("total_volume"), d.get("price_change_percentage_24h"),
            d.get("circulating_supply"),
        ))

    conn.commit()
    print(f"  Inserted/updated {len(coins)} coins + market snapshot")
    return coins


def seed_historical(conn, coins):
    """Fetch 90 days of historical prices for top 20 coins."""
    print("\n[2/3] Fetching 90-day historical data (top 20 coins)...")
    cur = conn.cursor()
    total_inserted = 0

    for i, coin in enumerate(coins[:20]):
        cg_id = coin["coingecko_id"]
        db_id = coin["db_id"]
        print(f"  [{i+1}/20] {cg_id}...", end=" ", flush=True)

        time.sleep(7)  # Rate limiting: ~8 req/min
        data = api_get(f"/coins/{cg_id}/market_chart", {"vs_currency": "usd", "days": "90"})

        if not data or "prices" not in data:
            print("SKIP")
            continue

        count = 0
        for price_point in data["prices"]:
            ts = datetime.fromtimestamp(price_point[0] / 1000, tz=timezone.utc)
            price = price_point[1]
            cur.execute("""
                INSERT INTO fact_market_data (coin_id, timestamp, price_usd)
                VALUES (%s, %s, %s)
                ON CONFLICT (coin_id, timestamp) DO NOTHING
            """, (db_id, ts, price))
            count += 1

        conn.commit()
        total_inserted += count
        print(f"{count} points")

    print(f"  Total: {total_inserted} historical data points inserted")


def compute_initial_ohlcv(conn):
    """Compute daily OHLCV from existing market data."""
    print("\n[3/3] Computing daily OHLCV aggregates...")
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO fact_daily_ohlcv (coin_id, date, open_price, high_price, low_price, close_price, volume)
        SELECT
            coin_id,
            DATE(timestamp) as date,
            (ARRAY_AGG(price_usd ORDER BY timestamp ASC))[1] as open_price,
            MAX(price_usd) as high_price,
            MIN(price_usd) as low_price,
            (ARRAY_AGG(price_usd ORDER BY timestamp DESC))[1] as close_price,
            AVG(total_volume) as volume
        FROM fact_market_data
        WHERE price_usd IS NOT NULL
        GROUP BY coin_id, DATE(timestamp)
        ON CONFLICT (coin_id, date) DO UPDATE SET
            open_price = EXCLUDED.open_price,
            high_price = EXCLUDED.high_price,
            low_price = EXCLUDED.low_price,
            close_price = EXCLUDED.close_price,
            volume = EXCLUDED.volume
    """)
    conn.commit()
    print(f"  OHLCV rows upserted: {cur.rowcount}")

    # Refresh materialized view
    cur.execute("REFRESH MATERIALIZED VIEW mv_latest_market_data")
    conn.commit()
    print("  Materialized view refreshed")


def main():
    print("=" * 60)
    print("CryptoFlow Data Seeding")
    print("=" * 60)

    conn = psycopg2.connect(DB_URL)
    try:
        coins = seed_coins(conn)
        if coins:
            seed_historical(conn, coins)
            compute_initial_ohlcv(conn)

        # Summary
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM dim_coin")
        print(f"\nSummary:")
        print(f"  Coins: {cur.fetchone()[0]}")
        cur.execute("SELECT COUNT(*) FROM fact_market_data")
        print(f"  Market data points: {cur.fetchone()[0]}")
        cur.execute("SELECT COUNT(*) FROM fact_daily_ohlcv")
        print(f"  Daily OHLCV rows: {cur.fetchone()[0]}")
        print("\nSeeding complete!")
    finally:
        conn.close()


if __name__ == "__main__":
    main()

from collections import OrderedDict

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.coin import DimCoin


def get_market_overview(db: Session) -> dict:
    """Get total market cap, volume, BTC dominance, top movers."""
    latest = db.execute(text("SELECT * FROM mv_latest_market_data")).fetchall()

    if not latest:
        return {
            "total_market_cap": 0,
            "total_volume_24h": 0,
            "btc_dominance": 0,
            "active_coins": 0,
            "top_gainers": [],
            "top_losers": [],
            "market_cap_change_24h_pct": None,
            "volume_change_24h_pct": None,
            "last_updated": None,
        }

    total_market_cap = sum(float(r.market_cap or 0) for r in latest)
    total_volume = sum(float(r.total_volume or 0) for r in latest)

    # Get aggregate values from ~24h ago for delta calculation
    prev_row = db.execute(text("""
        SELECT
            SUM(price_usd * circulating_supply) AS prev_market_cap,
            SUM(total_volume) AS prev_volume
        FROM (
            SELECT DISTINCT ON (coin_id) coin_id, price_usd, circulating_supply, total_volume
            FROM fact_market_data
            WHERE timestamp <= NOW() - INTERVAL '24 hours'
              AND timestamp >= NOW() - INTERVAL '48 hours'
              AND price_usd IS NOT NULL
            ORDER BY coin_id, timestamp DESC
        ) AS prev
    """)).fetchone()

    prev_market_cap = float(prev_row.prev_market_cap) if prev_row and prev_row.prev_market_cap else None
    prev_volume = float(prev_row.prev_volume) if prev_row and prev_row.prev_volume else None

    market_cap_change_pct = None
    if prev_market_cap and prev_market_cap > 0:
        market_cap_change_pct = round((total_market_cap - prev_market_cap) / prev_market_cap * 100, 2)

    volume_change_pct = None
    if prev_volume and prev_volume > 0:
        volume_change_pct = round((total_volume - prev_volume) / prev_volume * 100, 2)

    # Build coin map only for IDs present in latest data
    coin_ids = [r.coin_id for r in latest]
    coins = {c.id: c for c in db.query(DimCoin).filter(DimCoin.id.in_(coin_ids)).all()} if coin_ids else {}

    # BTC dominance (using already-fetched coins)
    btc_cap = 0
    for r in latest:
        coin = coins.get(r.coin_id)
        if coin and coin.symbol == "btc":
            btc_cap = float(r.market_cap or 0)
            break
    btc_dominance = (btc_cap / total_market_cap * 100) if total_market_cap > 0 else 0

    movers = []
    for r in latest:
        coin = coins.get(r.coin_id)
        if coin and r.price_change_24h_pct is not None:
            movers.append({
                "id": coin.id,
                "symbol": coin.symbol,
                "name": coin.name,
                "image_url": coin.image_url,
                "price_usd": float(r.price_usd or 0),
                "price_change_24h_pct": float(r.price_change_24h_pct),
            })

    movers.sort(key=lambda x: x["price_change_24h_pct"], reverse=True)

    # Get the most recent data timestamp
    last_updated_row = db.execute(text(
        "SELECT MAX(timestamp) AS last_updated FROM fact_market_data"
    )).fetchone()
    last_updated = last_updated_row.last_updated.isoformat() if last_updated_row and last_updated_row.last_updated else None

    return {
        "total_market_cap": total_market_cap,
        "total_volume_24h": total_volume,
        "btc_dominance": round(btc_dominance, 2),
        "active_coins": len(latest),
        "top_gainers": movers[:5],
        "top_losers": movers[-5:][::-1],
        "market_cap_change_24h_pct": market_cap_change_pct,
        "volume_change_24h_pct": volume_change_pct,
        "last_updated": last_updated,
    }


def get_market_dominance(db: Session, days: int) -> list[dict]:
    """Get market dominance (% of total market cap) for the top 10 coins over time.

    Returns hourly data points, each containing the dominance percentage for each
    of the top 10 coins by market_cap_rank.  Capped at 168 data points (7 days
    of hourly data) even when `days` is larger – the query itself limits to
    `days` worth of data and then rounds to the nearest hour.
    """
    rows = db.execute(text("""
        WITH top_coins AS (
            SELECT id, symbol, name
            FROM dim_coin
            WHERE market_cap_rank IS NOT NULL
            ORDER BY market_cap_rank
            LIMIT 10
        ),
        bucketed AS (
            SELECT
                date_trunc('hour', f.timestamp) AS bucket,
                f.coin_id,
                AVG(f.market_cap) AS avg_market_cap
            FROM fact_market_data f
            WHERE f.timestamp >= NOW() - MAKE_INTERVAL(days => :days)
              AND f.market_cap IS NOT NULL
              AND f.market_cap > 0
            GROUP BY bucket, f.coin_id
        ),
        totals AS (
            SELECT bucket, SUM(avg_market_cap) AS total_cap
            FROM bucketed
            GROUP BY bucket
            HAVING SUM(avg_market_cap) > 0
        )
        SELECT
            b.bucket AS timestamp,
            tc.symbol,
            tc.name,
            ROUND((b.avg_market_cap / t.total_cap * 100)::numeric, 2) AS dominance
        FROM bucketed b
        JOIN top_coins tc ON tc.id = b.coin_id
        JOIN totals t ON t.bucket = b.bucket
        ORDER BY b.bucket, dominance DESC
    """), {"days": days}).fetchall()

    # Group by timestamp
    grouped: OrderedDict[str, list[dict]] = OrderedDict()
    for row in rows:
        ts = row.timestamp.isoformat()
        if ts not in grouped:
            grouped[ts] = []
        grouped[ts].append({
            "symbol": row.symbol.upper(),
            "name": row.name,
            "dominance": float(row.dominance),
        })

    result = [{"timestamp": ts, "coins": coins} for ts, coins in grouped.items()]

    # Limit to ~168 data points to keep payload reasonable
    if len(result) > 168:
        step = len(result) / 168
        result = [result[int(i * step)] for i in range(168)]

    return result


def get_kpi_sparklines(db: Session) -> dict:
    """Get 7-day sparkline data for KPI cards: market cap, volume, BTC dominance.

    Returns ~28 data points (every 6 hours, sampled from 10-min snapshots).
    """
    btc_coin = db.query(DimCoin).filter(DimCoin.symbol == "btc").first()
    btc_id = btc_coin.id if btc_coin else -1

    rows = db.execute(text("""
        WITH bucketed AS (
            SELECT
                date_trunc('hour', timestamp) +
                    (EXTRACT(hour FROM timestamp)::int / 6) * INTERVAL '6 hours'
                    - (EXTRACT(hour FROM date_trunc('hour', timestamp))::int % 6) * INTERVAL '1 hour'
                AS bucket,
                SUM(market_cap) AS total_market_cap,
                SUM(total_volume) AS total_volume,
                SUM(CASE WHEN coin_id = :btc_id THEN market_cap ELSE 0 END) AS btc_market_cap
            FROM fact_market_data
            WHERE timestamp >= NOW() - INTERVAL '7 days'
              AND price_usd IS NOT NULL
            GROUP BY bucket
        )
        SELECT
            bucket,
            total_market_cap,
            total_volume,
            CASE WHEN total_market_cap > 0
                 THEN (btc_market_cap / total_market_cap * 100)
                 ELSE 0 END AS btc_dominance
        FROM bucketed
        ORDER BY bucket
    """), {"btc_id": btc_id}).fetchall()

    return {
        "market_cap": [float(r.total_market_cap or 0) for r in rows],
        "volume": [float(r.total_volume or 0) for r in rows],
        "btc_dominance": [round(float(r.btc_dominance or 0), 2) for r in rows],
    }

from sqlalchemy import text, func, desc
from sqlalchemy.orm import Session

from app.models.coin import DimCoin
from app.models.market_data import FactMarketData


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

    # BTC dominance
    btc_coin = db.query(DimCoin).filter(DimCoin.symbol == "btc").first()
    btc_cap = 0
    if btc_coin:
        for r in latest:
            if r.coin_id == btc_coin.id:
                btc_cap = float(r.market_cap or 0)
                break
    btc_dominance = (btc_cap / total_market_cap * 100) if total_market_cap > 0 else 0

    # Build coin map for names
    coins = {c.id: c for c in db.query(DimCoin).all()}

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

    return {
        "total_market_cap": total_market_cap,
        "total_volume_24h": total_volume,
        "btc_dominance": round(btc_dominance, 2),
        "active_coins": len(latest),
        "top_gainers": movers[:5],
        "top_losers": movers[-5:][::-1],
        "market_cap_change_24h_pct": market_cap_change_pct,
        "volume_change_24h_pct": volume_change_pct,
    }

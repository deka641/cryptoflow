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
        }

    total_market_cap = sum(float(r.market_cap or 0) for r in latest)
    total_volume = sum(float(r.total_volume or 0) for r in latest)

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
    }

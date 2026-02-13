from pydantic import BaseModel

class MarketOverview(BaseModel):
    total_market_cap: float
    total_volume_24h: float
    btc_dominance: float
    active_coins: int
    top_gainers: list[dict]  # [{id, symbol, name, price_change_24h_pct}]
    top_losers: list[dict]

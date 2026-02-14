from pydantic import BaseModel
from datetime import datetime, date

class CoinBase(BaseModel):
    coingecko_id: str
    symbol: str
    name: str

class CoinResponse(CoinBase):
    id: int
    category: str | None = None
    image_url: str | None = None
    market_cap_rank: int | None = None
    created_at: datetime
    # Latest market data (from materialized view)
    price_usd: float | None = None
    market_cap: float | None = None
    total_volume: float | None = None
    price_change_24h_pct: float | None = None

    class Config:
        from_attributes = True

class CoinDetail(CoinResponse):
    description: str | None = None
    circulating_supply: float | None = None

class PricePoint(BaseModel):
    timestamp: datetime
    price_usd: float | None

class CoinHistory(BaseModel):
    coin_id: int
    symbol: str
    name: str
    prices: list[PricePoint]

class OHLCVPoint(BaseModel):
    date: date
    open: float | None
    high: float | None
    low: float | None
    close: float | None
    volume: float | None

class CoinOHLCV(BaseModel):
    coin_id: int
    symbol: str
    name: str
    candles: list[OHLCVPoint]

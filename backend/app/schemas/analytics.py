from pydantic import BaseModel
from datetime import datetime

class CorrelationEntry(BaseModel):
    coin_a_id: int
    coin_a_symbol: str
    coin_b_id: int
    coin_b_symbol: str
    correlation: float
    period_days: int

class CorrelationMatrix(BaseModel):
    coins: list[str]  # symbols
    matrix: list[list[float | None]]
    period_days: int
    computed_at: datetime | None

class VolatilityEntry(BaseModel):
    coin_id: int
    symbol: str
    name: str
    volatility: float
    max_drawdown: float | None
    sharpe_ratio: float | None
    period_days: int
    market_cap: float | None = None
    image_url: str | None = None

    class Config:
        from_attributes = True

from datetime import datetime

from pydantic import BaseModel, Field


class HoldingCreate(BaseModel):
    coin_id: int
    quantity: float = Field(gt=0)
    buy_price_usd: float = Field(ge=0)
    notes: str | None = None


class HoldingUpdate(BaseModel):
    quantity: float | None = Field(None, gt=0)
    buy_price_usd: float | None = Field(None, ge=0)
    notes: str | None = None


class HoldingResponse(BaseModel):
    id: int
    coin_id: int
    coingecko_id: str
    symbol: str
    name: str
    image_url: str | None
    quantity: float
    buy_price_usd: float
    current_price_usd: float | None
    current_value_usd: float | None
    cost_basis_usd: float
    pnl_usd: float | None
    pnl_pct: float | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class PortfolioSummary(BaseModel):
    total_value_usd: float
    total_cost_basis_usd: float
    total_pnl_usd: float
    total_pnl_pct: float | None
    holdings_count: int
    unique_coins: int


class PerformancePoint(BaseModel):
    timestamp: str
    value_usd: float


class PortfolioPerformance(BaseModel):
    days: int
    data_points: list[PerformancePoint]

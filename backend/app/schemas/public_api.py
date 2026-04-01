"""Pydantic response models for the Public API endpoints."""

from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class PublicPaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper for public API endpoints."""

    items: list[T]
    total: int
    page: int
    per_page: int
    pages: int


class PublicCoinListItem(BaseModel):
    """Response item for GET /public/coins."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    symbol: str
    name: str
    market_cap_rank: int | None = None
    price_usd: float | None = None
    market_cap: float | None = None
    total_volume: float | None = None
    price_change_24h_pct: float | None = None


class PublicCoinDetail(BaseModel):
    """Response for GET /public/coins/{coin_id}."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    coingecko_id: str
    symbol: str
    name: str
    category: str | None = None
    market_cap_rank: int | None = None
    price_usd: float | None = None
    market_cap: float | None = None
    total_volume: float | None = None
    price_change_24h_pct: float | None = None
    circulating_supply: float | None = None


class _MarketMover(BaseModel):
    """A coin entry in top_gainers / top_losers."""

    id: int
    symbol: str
    name: str
    image_url: str | None = None
    price_usd: float
    price_change_24h_pct: float


class PublicMarketOverview(BaseModel):
    """Response for GET /public/market/overview."""

    total_market_cap: float
    total_volume_24h: float
    btc_dominance: float
    active_coins: int
    top_gainers: list[_MarketMover]
    top_losers: list[_MarketMover]
    market_cap_change_24h_pct: float | None = None
    volume_change_24h_pct: float | None = None
    last_updated: str | None = None


class PublicCorrelationResponse(BaseModel):
    """Response for GET /public/analytics/correlation."""

    coins: list[str]
    matrix: list[list[float | None]]
    period_days: int
    computed_at: datetime | None = None


class PublicVolatilityItem(BaseModel):
    """Response item for GET /public/analytics/volatility."""

    coin_id: int
    symbol: str
    name: str
    volatility: float
    max_drawdown: float | None = None
    sharpe_ratio: float | None = None
    period_days: int
    market_cap: float | None = None
    image_url: str | None = None

from datetime import datetime, timezone

from sqlalchemy import Integer, String, Text, DateTime, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DimCoin(Base):
    __tablename__ = "dim_coin"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    coingecko_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String(500))
    market_cap_rank: Mapped[int | None] = mapped_column(Integer)
    ath: Mapped[float | None] = mapped_column(Numeric)
    ath_date: Mapped[datetime | None] = mapped_column(DateTime)
    atl: Mapped[float | None] = mapped_column(Numeric)
    atl_date: Mapped[datetime | None] = mapped_column(DateTime)
    total_supply: Mapped[float | None] = mapped_column(Numeric)
    max_supply: Mapped[float | None] = mapped_column(Numeric)
    high_24h: Mapped[float | None] = mapped_column(Numeric)
    low_24h: Mapped[float | None] = mapped_column(Numeric)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

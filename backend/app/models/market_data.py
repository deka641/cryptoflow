from datetime import datetime, date

from sqlalchemy import Integer, BigInteger, Numeric, DateTime, Date, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class FactMarketData(Base):
    __tablename__ = "fact_market_data"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    coin_id: Mapped[int] = mapped_column(Integer, ForeignKey("dim_coin.id"), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    price_usd: Mapped[float | None] = mapped_column(Numeric(20, 8))
    market_cap: Mapped[float | None] = mapped_column(Numeric(24, 2))
    total_volume: Mapped[float | None] = mapped_column(Numeric(24, 2))
    price_change_24h_pct: Mapped[float | None] = mapped_column(Numeric(10, 4))
    circulating_supply: Mapped[float | None] = mapped_column(Numeric(24, 2))

    __table_args__ = (
        UniqueConstraint("coin_id", "timestamp", name="uq_market_coin_ts"),
        Index("idx_fact_market_ts", "timestamp", postgresql_using="btree"),
        Index("idx_fact_market_coin_ts", "coin_id", "timestamp"),
    )


class FactDailyOHLCV(Base):
    __tablename__ = "fact_daily_ohlcv"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    coin_id: Mapped[int] = mapped_column(Integer, ForeignKey("dim_coin.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, ForeignKey("dim_time.date"), nullable=False)
    open_price: Mapped[float | None] = mapped_column(Numeric(20, 8))
    high_price: Mapped[float | None] = mapped_column(Numeric(20, 8))
    low_price: Mapped[float | None] = mapped_column(Numeric(20, 8))
    close_price: Mapped[float | None] = mapped_column(Numeric(20, 8))
    volume: Mapped[float | None] = mapped_column(Numeric(24, 2))

    __table_args__ = (
        UniqueConstraint("coin_id", "date", name="uq_ohlcv_coin_date"),
    )

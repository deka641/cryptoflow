from datetime import datetime

from sqlalchemy import Integer, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AnalyticsCorrelation(Base):
    __tablename__ = "analytics_correlation"

    coin_a_id: Mapped[int] = mapped_column(Integer, ForeignKey("dim_coin.id"), primary_key=True)
    coin_b_id: Mapped[int] = mapped_column(Integer, ForeignKey("dim_coin.id"), primary_key=True)
    period_days: Mapped[int] = mapped_column(Integer, primary_key=True)
    correlation: Mapped[float | None] = mapped_column(Numeric(8, 6))
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AnalyticsVolatility(Base):
    __tablename__ = "analytics_volatility"

    coin_id: Mapped[int] = mapped_column(Integer, ForeignKey("dim_coin.id"), primary_key=True)
    period_days: Mapped[int] = mapped_column(Integer, primary_key=True)
    volatility: Mapped[float | None] = mapped_column(Numeric(12, 6))
    max_drawdown: Mapped[float | None] = mapped_column(Numeric(10, 4))
    sharpe_ratio: Mapped[float | None] = mapped_column(Numeric(10, 4))
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

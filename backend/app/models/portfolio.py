from datetime import datetime

from sqlalchemy import Integer, Numeric, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    coin_id: Mapped[int] = mapped_column(Integer, ForeignKey("dim_coin.id", ondelete="CASCADE"), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(24, 8), nullable=False)
    buy_price_usd: Mapped[float] = mapped_column(Numeric(20, 8), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_portfolio_user", "user_id"),
        Index("idx_portfolio_user_coin", "user_id", "coin_id"),
    )

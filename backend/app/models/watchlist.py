from datetime import datetime

from sqlalchemy import Integer, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserWatchlist(Base):
    __tablename__ = "user_watchlist"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    coin_id: Mapped[int] = mapped_column(Integer, ForeignKey("dim_coin.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "coin_id", name="uq_user_watchlist"),
        Index("idx_watchlist_user", "user_id"),
    )

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import ForeignKey, Index, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PriceAlert(Base):
    __tablename__ = "price_alerts"
    __table_args__ = (
        Index("idx_alert_user_coin", "user_id", "coin_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    coin_id: Mapped[int] = mapped_column(ForeignKey("dim_coin.id", ondelete="CASCADE"), index=True)
    target_price: Mapped[Decimal] = mapped_column(Numeric(20, 8))
    direction: Mapped[str] = mapped_column()  # "above" or "below"
    triggered: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
    triggered_at: Mapped[datetime | None] = mapped_column(default=None)

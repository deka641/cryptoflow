from datetime import datetime, timezone

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PriceAlert(Base):
    __tablename__ = "price_alerts"
    __table_args__ = (
        UniqueConstraint("user_id", "coin_id", "direction", name="uq_user_coin_direction"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    coin_id: Mapped[int] = mapped_column(ForeignKey("dim_coin.id", ondelete="CASCADE"))
    target_price: Mapped[float] = mapped_column()
    direction: Mapped[str] = mapped_column()  # "above" or "below"
    triggered: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
    triggered_at: Mapped[datetime | None] = mapped_column(default=None)

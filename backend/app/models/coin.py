from datetime import datetime

from sqlalchemy import Integer, String, Text, DateTime
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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

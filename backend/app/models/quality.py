from datetime import datetime

from sqlalchemy import Integer, String, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DataQualityCheck(Base):
    __tablename__ = "data_quality_checks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    check_name: Mapped[str] = mapped_column(String(200), nullable=False)
    table_name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # passed, failed, warning
    details: Mapped[dict | None] = mapped_column(JSON)
    executed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

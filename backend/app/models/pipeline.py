from datetime import datetime

from sqlalchemy import Integer, String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dag_id: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    start_time: Mapped[datetime | None] = mapped_column(DateTime)
    end_time: Mapped[datetime | None] = mapped_column(DateTime)
    records_processed: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

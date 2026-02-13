from datetime import date

from sqlalchemy import SmallInteger, Boolean, Date
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DimTime(Base):
    __tablename__ = "dim_time"

    date: Mapped[date] = mapped_column(Date, primary_key=True)
    year: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    quarter: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    month: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    week: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    day_of_week: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    day_of_month: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    is_weekend: Mapped[bool] = mapped_column(Boolean, nullable=False)

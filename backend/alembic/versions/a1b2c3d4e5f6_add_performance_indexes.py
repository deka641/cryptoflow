"""add performance indexes for alerts and ohlcv

Revision ID: a1b2c3d4e5f6
Revises: 1d558ccbc42d
Create Date: 2026-03-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "0638d2178d1f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Partial index for untriggered alerts per user — speeds up /check endpoint
    op.create_index(
        "idx_alert_user_untriggered",
        "price_alerts",
        ["user_id"],
        postgresql_where="NOT triggered",
    )
    # Index on fact_daily_ohlcv.date for date-range analytics queries
    op.create_index(
        "idx_ohlcv_date",
        "fact_daily_ohlcv",
        ["date"],
    )


def downgrade() -> None:
    op.drop_index("idx_ohlcv_date", table_name="fact_daily_ohlcv")
    op.drop_index("idx_alert_user_untriggered", table_name="price_alerts")

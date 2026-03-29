"""add webhook_status to alerts

Revision ID: c4e5f6a7b8d9
Revises: b3d7f9a1c2e4
Create Date: 2026-03-29 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4e5f6a7b8d9"
down_revision: Union[str, None] = "b3d7f9a1c2e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("price_alerts", sa.Column("webhook_status", sa.String(10), nullable=True))
    op.add_column("price_alerts", sa.Column("webhook_attempts", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("price_alerts", "webhook_attempts")
    op.drop_column("price_alerts", "webhook_status")

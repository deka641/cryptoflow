"""add webhook_url to users

Revision ID: b3d7f9a1c2e4
Revises: ffa6e2c5127a
Create Date: 2026-03-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b3d7f9a1c2e4"
down_revision: Union[str, None] = "ffa6e2c5127a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("webhook_url", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "webhook_url")

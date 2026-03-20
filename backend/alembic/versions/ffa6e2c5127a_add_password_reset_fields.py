"""add password reset fields

Revision ID: ffa6e2c5127a
Revises: a1b2c3d4e5f6
Create Date: 2026-03-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "ffa6e2c5127a"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_reset_token", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("reset_token_expires", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "reset_token_expires")
    op.drop_column("users", "password_reset_token")

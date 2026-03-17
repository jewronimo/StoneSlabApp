"""add thumbnail_url column to slabs

Revision ID: 20260317_add_thumbnail_url
Revises:
Create Date: 2026-03-17
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260317_add_thumbnail_url"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("slabs", sa.Column("thumbnail_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("slabs", "thumbnail_url")

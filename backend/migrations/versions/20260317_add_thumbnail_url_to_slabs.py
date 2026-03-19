"""add thumbnail_url column to slabs

Revision ID: 20260317_add_thumbnail_url
Revises:
Create Date: 2026-03-17
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260317_add_thumbnail_url"
down_revision = "20260316_create_slabs_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_columns = {col["name"] for col in inspector.get_columns("slabs")}

    if "thumbnail_url" not in existing_columns:
        op.add_column(
            "slabs",
            sa.Column("thumbnail_url", sa.String(length=500), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_columns = {col["name"] for col in inspector.get_columns("slabs")}

    if "thumbnail_url" in existing_columns:
        op.drop_column("slabs", "thumbnail_url")

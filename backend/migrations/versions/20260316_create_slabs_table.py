"""create slabs table baseline

Revision ID: 20260316_create_slabs_table
Revises:
Create Date: 2026-03-16
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "20260316_create_slabs_table"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if inspector.has_table("slabs"):
        return

    op.create_table(
        "slabs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("slab_code", sa.String(length=50), nullable=False),
        sa.Column("material_name", sa.String(length=255), nullable=False),
        sa.Column("finish", sa.String(length=50), nullable=False),
        sa.Column("height", sa.String(length=50), nullable=False),
        sa.Column("height_value", sa.Float(), nullable=False),
        sa.Column("width", sa.String(length=50), nullable=False),
        sa.Column("width_value", sa.Float(), nullable=False),
        sa.Column("thickness", sa.String(length=50), nullable=False),
        sa.Column("thickness_value", sa.Float(), nullable=False),
        sa.Column("warehouse_group", sa.String(length=10), nullable=False),
        sa.Column("price_per_sqft", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("customer_name", sa.String(length=255), nullable=True),
        sa.Column("project_name", sa.String(length=255), nullable=True),
        sa.Column("item_description", sa.String(length=500), nullable=True),
        sa.Column("porosity", sa.Boolean(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("image_filename", sa.String(length=255), nullable=True),
        sa.Column("image_content_type", sa.String(length=100), nullable=True),
        sa.Column("match_group_code", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("ix_slabs_id", "slabs", ["id"])
    op.create_index("ix_slabs_match_group_code", "slabs", ["match_group_code"])
    op.create_index("ix_slabs_slab_code", "slabs", ["slab_code"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if not inspector.has_table("slabs"):
        return

    existing_indexes = {idx["name"] for idx in inspector.get_indexes("slabs")}
    if "ix_slabs_slab_code" in existing_indexes:
        op.drop_index("ix_slabs_slab_code", table_name="slabs")
    if "ix_slabs_match_group_code" in existing_indexes:
        op.drop_index("ix_slabs_match_group_code", table_name="slabs")
    if "ix_slabs_id" in existing_indexes:
        op.drop_index("ix_slabs_id", table_name="slabs")

    op.drop_table("slabs")

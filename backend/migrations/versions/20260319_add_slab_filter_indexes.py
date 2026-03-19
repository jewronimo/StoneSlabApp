"""add indexes used by slab list filters

Revision ID: 20260319_add_slab_filter_indexes
Revises: 20260317_add_thumbnail_url
Create Date: 2026-03-19
"""

from alembic import op
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "20260319_add_slab_filter_indexes"
down_revision = "20260317_add_thumbnail_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_indexes = {idx["name"] for idx in inspector.get_indexes("slabs")}

    if "ix_slabs_is_active" not in existing_indexes:
        op.create_index("ix_slabs_is_active", "slabs", ["is_active"])
    if "ix_slabs_status" not in existing_indexes:
        op.create_index("ix_slabs_status", "slabs", ["status"])
    if "ix_slabs_warehouse_group" not in existing_indexes:
        op.create_index("ix_slabs_warehouse_group", "slabs", ["warehouse_group"])
    if "ix_slabs_material_name" not in existing_indexes:
        op.create_index("ix_slabs_material_name", "slabs", ["material_name"])
    if "ix_slabs_finish" not in existing_indexes:
        op.create_index("ix_slabs_finish", "slabs", ["finish"])
    if "ix_slabs_porosity" not in existing_indexes:
        op.create_index("ix_slabs_porosity", "slabs", ["porosity"])
    if "ix_slabs_height_value" not in existing_indexes:
        op.create_index("ix_slabs_height_value", "slabs", ["height_value"])
    if "ix_slabs_width_value" not in existing_indexes:
        op.create_index("ix_slabs_width_value", "slabs", ["width_value"])
    if "ix_slabs_thickness_value" not in existing_indexes:
        op.create_index("ix_slabs_thickness_value", "slabs", ["thickness_value"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_indexes = {idx["name"] for idx in inspector.get_indexes("slabs")}

    if "ix_slabs_thickness_value" in existing_indexes:
        op.drop_index("ix_slabs_thickness_value", table_name="slabs")
    if "ix_slabs_width_value" in existing_indexes:
        op.drop_index("ix_slabs_width_value", table_name="slabs")
    if "ix_slabs_height_value" in existing_indexes:
        op.drop_index("ix_slabs_height_value", table_name="slabs")
    if "ix_slabs_porosity" in existing_indexes:
        op.drop_index("ix_slabs_porosity", table_name="slabs")
    if "ix_slabs_finish" in existing_indexes:
        op.drop_index("ix_slabs_finish", table_name="slabs")
    if "ix_slabs_material_name" in existing_indexes:
        op.drop_index("ix_slabs_material_name", table_name="slabs")
    if "ix_slabs_warehouse_group" in existing_indexes:
        op.drop_index("ix_slabs_warehouse_group", table_name="slabs")
    if "ix_slabs_status" in existing_indexes:
        op.drop_index("ix_slabs_status", table_name="slabs")
    if "ix_slabs_is_active" in existing_indexes:
        op.drop_index("ix_slabs_is_active", table_name="slabs")

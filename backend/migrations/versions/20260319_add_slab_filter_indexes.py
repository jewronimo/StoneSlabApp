"""add indexes used by slab list filters

Revision ID: 20260319_add_slab_filter_indexes
Revises: 20260317_add_thumbnail_url
Create Date: 2026-03-19
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "20260319_add_slab_filter_indexes"
down_revision = "20260317_add_thumbnail_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_slabs_is_active", "slabs", ["is_active"])
    op.create_index("ix_slabs_status", "slabs", ["status"])
    op.create_index("ix_slabs_warehouse_group", "slabs", ["warehouse_group"])
    op.create_index("ix_slabs_material_name", "slabs", ["material_name"])
    op.create_index("ix_slabs_finish", "slabs", ["finish"])
    op.create_index("ix_slabs_porosity", "slabs", ["porosity"])
    op.create_index("ix_slabs_height_value", "slabs", ["height_value"])
    op.create_index("ix_slabs_width_value", "slabs", ["width_value"])
    op.create_index("ix_slabs_thickness_value", "slabs", ["thickness_value"])


def downgrade() -> None:
    op.drop_index("ix_slabs_thickness_value", table_name="slabs")
    op.drop_index("ix_slabs_width_value", table_name="slabs")
    op.drop_index("ix_slabs_height_value", table_name="slabs")
    op.drop_index("ix_slabs_porosity", table_name="slabs")
    op.drop_index("ix_slabs_finish", table_name="slabs")
    op.drop_index("ix_slabs_material_name", table_name="slabs")
    op.drop_index("ix_slabs_warehouse_group", table_name="slabs")
    op.drop_index("ix_slabs_status", table_name="slabs")
    op.drop_index("ix_slabs_is_active", table_name="slabs")

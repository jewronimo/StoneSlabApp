"""add users and audit logs tables

Revision ID: 20260319_add_users_and_audit_logs
Revises: 20260319_add_slab_filter_indexes
Create Date: 2026-03-19
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260319_add_users_and_audit_logs"
down_revision = "20260319_add_slab_filter_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if not inspector.has_table("users"):
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("username", sa.String(length=100), nullable=False),
            sa.Column("password_hash", sa.String(length=255), nullable=False),
            sa.Column("role", sa.String(length=30), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_users_id", "users", ["id"])
        op.create_index("ix_users_username", "users", ["username"], unique=True)
        op.create_index("ix_users_role", "users", ["role"])

    if not inspector.has_table("audit_logs"):
        op.create_table(
            "audit_logs",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("actor_username", sa.String(length=100), nullable=False),
            sa.Column("actor_role", sa.String(length=30), nullable=False),
            sa.Column("action_type", sa.String(length=120), nullable=False),
            sa.Column("slab_code", sa.String(length=50), nullable=True),
            sa.Column("slab_id", sa.Integer(), nullable=True),
            sa.Column("details", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_audit_logs_id", "audit_logs", ["id"])
        op.create_index("ix_audit_logs_actor_username", "audit_logs", ["actor_username"])
        op.create_index("ix_audit_logs_actor_role", "audit_logs", ["actor_role"])
        op.create_index("ix_audit_logs_action_type", "audit_logs", ["action_type"])
        op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if inspector.has_table("audit_logs"):
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("audit_logs")}
        for idx_name in [
            "ix_audit_logs_created_at",
            "ix_audit_logs_action_type",
            "ix_audit_logs_actor_role",
            "ix_audit_logs_actor_username",
            "ix_audit_logs_id",
        ]:
            if idx_name in existing_indexes:
                op.drop_index(idx_name, table_name="audit_logs")
        op.drop_table("audit_logs")

    if inspector.has_table("users"):
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("users")}
        for idx_name in ["ix_users_role", "ix_users_username", "ix_users_id"]:
            if idx_name in existing_indexes:
                op.drop_index(idx_name, table_name="users")
        op.drop_table("users")

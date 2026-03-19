from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Float, Integer, Numeric, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Slab(Base):
    __tablename__ = "slabs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    slab_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    material_name: Mapped[str] = mapped_column(String(255))
    finish: Mapped[str] = mapped_column(String(50))
    height: Mapped[str] = mapped_column(String(50))
    height_value: Mapped[float] = mapped_column(Float)
    width: Mapped[str] = mapped_column(String(50))
    width_value: Mapped[float] = mapped_column(Float)
    thickness: Mapped[str] = mapped_column(String(50))
    thickness_value: Mapped[float] = mapped_column(Float)
    warehouse_group: Mapped[str] = mapped_column(String(10))
    price_per_sqft: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="available")
    customer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    project_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    item_description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    porosity: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    image_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    image_content_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    match_group_code: Mapped[str | None] = mapped_column(
        String(100), index=True, nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(30), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    actor_username: Mapped[str] = mapped_column(String(100), index=True)
    actor_role: Mapped[str] = mapped_column(String(30), index=True)
    action_type: Mapped[str] = mapped_column(String(120), index=True)
    slab_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    slab_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

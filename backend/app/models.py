from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
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
    width: Mapped[str] = mapped_column(String(50))
    thickness: Mapped[str] = mapped_column(String(50))
    warehouse_group: Mapped[str] = mapped_column(String(10))
    status: Mapped[str] = mapped_column(String(20), default="available")
    customer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    project_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    item_description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    porosity: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    image_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    image_content_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    match_group_code: Mapped[str | None] = mapped_column(
        String(100), index=True, nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
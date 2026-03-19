from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SlabResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slab_code: str
    material_name: str
    finish: str
    height: str
    height_value: float | None = None
    width: str
    width_value: float | None = None
    thickness: str
    thickness_value: float | None = None
    warehouse_group: str
    price_per_sqft: float | None = None
    square_feet: float | None = None
    total_price: float | None = None
    status: str
    customer_name: Optional[str]
    project_name: Optional[str]
    item_description: Optional[str]
    porosity: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    match_group_code: Optional[str] = None


class PaginatedSlabResponse(BaseModel):
    items: list[SlabResponse]
    page: int
    page_size: int
    total: int
    total_pages: int


class LoginRequest(BaseModel):
    username: str
    password: str


class CurrentUserResponse(BaseModel):
    username: str
    role: str
    is_active: bool


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: CurrentUserResponse

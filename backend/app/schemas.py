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
    height_value: float
    width: str
    width_value: float
    thickness: str
    thickness_value: float
    warehouse_group: str
    status: str
    customer_name: Optional[str]
    project_name: Optional[str]
    item_description: Optional[str]
    porosity: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    image_url: Optional[str] = None
    match_group_code: Optional[str] = None
    match_group_code: Optional[str] = None
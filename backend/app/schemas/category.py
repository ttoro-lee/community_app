from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CategoryBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = "📋"
    order: Optional[int] = 0
    admin_only: Optional[bool] = False


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None
    admin_only: Optional[bool] = None


class CategoryResponse(CategoryBase):
    id: int
    is_active: bool
    admin_only: bool = False
    created_at: datetime
    post_count: Optional[int] = 0

    class Config:
        from_attributes = True

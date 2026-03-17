from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.user import UserPublic
from app.schemas.category import CategoryResponse


class PostBase(BaseModel):
    title: str
    content: str
    category_id: Optional[int] = None


class PostCreate(PostBase):
    pass


class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category_id: Optional[int] = None


class PostResponse(BaseModel):
    id: int
    title: str
    content: str
    user_id: int
    category_id: Optional[int]
    view_count: int
    is_pinned: bool
    is_notice: bool = False
    original_category_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime]
    author: UserPublic
    category: Optional[CategoryResponse]
    like_count: int = 0
    comment_count: int = 0
    is_liked: bool = False

    class Config:
        from_attributes = True


class PostListResponse(BaseModel):
    id: int
    title: str
    content: str
    user_id: int
    view_count: int
    is_pinned: bool
    is_notice: bool = False
    created_at: datetime
    author: UserPublic
    category: Optional[CategoryResponse]
    like_count: int = 0
    comment_count: int = 0

    class Config:
        from_attributes = True


class PaginatedPosts(BaseModel):
    items: List[PostListResponse]
    total: int
    page: int
    size: int
    pages: int


class NoticeItem(BaseModel):
    id: int
    title: str
    created_at: datetime
    author: UserPublic
    category: Optional[CategoryResponse]
    is_notice: bool = True

    class Config:
        from_attributes = True

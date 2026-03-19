from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.user import UserPublic


class CommentBase(BaseModel):
    content: str


class CommentCreate(CommentBase):
    post_id: int
    parent_id: Optional[int] = None


class CommentUpdate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: int
    content: str
    user_id: int
    post_id: int
    parent_id: Optional[int]
    is_deleted: bool
    created_at: datetime
    updated_at: Optional[datetime]
    author: UserPublic
    replies: List["CommentResponse"] = []
    like_count: int = 0
    is_liked: bool = False

    class Config:
        from_attributes = True


CommentResponse.model_rebuild()


class MyCommentItem(BaseModel):
    """내 댓글 목록 조회용 경량 스키마"""
    id: int
    content: str
    post_id: int
    post_title: Optional[str]
    parent_id: Optional[int]   # None이면 댓글, 값이 있으면 대댓글
    is_deleted: bool
    created_at: datetime
    like_count: int = 0

    class Config:
        from_attributes = True


class PaginatedMyComments(BaseModel):
    items: List[MyCommentItem]
    total: int
    page: int
    size: int
    pages: int

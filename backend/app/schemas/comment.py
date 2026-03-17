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

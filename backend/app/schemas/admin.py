from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class UserAdminView(BaseModel):
    id: int
    username: str
    nickname: str
    email: str
    is_active: bool
    is_admin: bool
    is_super_admin: bool
    suspended_until: Optional[datetime]
    suspend_reason: Optional[str]
    created_at: datetime
    post_count: int = 0
    comment_count: int = 0

    class Config:
        from_attributes = True


class SuspendRequest(BaseModel):
    days: int           # 0이면 즉시 해제
    reason: Optional[str] = None


class ToggleAdminRequest(BaseModel):
    is_admin: bool


class AdminStatsResponse(BaseModel):
    total_users: int
    total_posts: int
    total_comments: int
    suspended_users: int
    admin_users: int


class PaginatedUsers(BaseModel):
    items: List[UserAdminView]
    total: int
    page: int
    size: int
    pages: int


class BestPostThresholdResponse(BaseModel):
    best_post_min_likes: int


class BestPostThresholdUpdate(BaseModel):
    best_post_min_likes: int

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationResponse(BaseModel):
    id: int
    type: str                       # "comment_on_post" | "reply_on_comment" | "arena_invite"
    actor_nickname: Optional[str]   # 알림을 유발한 유저 닉네임
    actor_avatar_url: Optional[str]
    post_id: Optional[int]
    post_title: Optional[str]
    comment_id: Optional[int]
    arena_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    count: int

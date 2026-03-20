from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, field_validator


class ArenaUserInfo(BaseModel):
    id: int
    nickname: str
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class ArenaMessageResponse(BaseModel):
    id: int
    arena_id: int
    user_id: int
    user: ArenaUserInfo
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ArenaCreate(BaseModel):
    opponent_id: int
    duration_minutes: int

    @field_validator("duration_minutes")
    @classmethod
    def validate_duration(cls, v):
        if v not in (5, 10, 15, 20, 25, 30):
            raise ValueError("duration_minutes must be 5, 10, 15, 20, 25, or 30")
        return v


class ArenaSendMessage(BaseModel):
    content: str


class ArenaVoteCreate(BaseModel):
    voted_for_id: int


class ArenaVoteCounts(BaseModel):
    creator_votes: int
    opponent_votes: int
    my_vote: Optional[int] = None   # voted_for_id or None


class ArenaResponse(BaseModel):
    id: int
    creator: ArenaUserInfo
    opponent: ArenaUserInfo
    duration_minutes: int
    status: str
    started_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    created_at: datetime
    creator_votes: int = 0
    opponent_votes: int = 0

    model_config = {"from_attributes": True}


class ArenaListItem(BaseModel):
    id: int
    creator: ArenaUserInfo
    opponent: ArenaUserInfo
    duration_minutes: int
    status: str
    started_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    created_at: datetime
    creator_votes: int = 0
    opponent_votes: int = 0
    message_count: int = 0

    model_config = {"from_attributes": True}


class PaginatedArenas(BaseModel):
    items: List[ArenaListItem]
    total: int
    page: int
    size: int
    pages: int

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class ReportCreate(BaseModel):
    post_id: int
    reason: str = Field(..., min_length=1, max_length=500)


class ReporterInfo(BaseModel):
    id: int
    nickname: str
    username: str

    class Config:
        from_attributes = True


class ReportResponse(BaseModel):
    id: int
    post_id: int
    reporter_id: int
    reason: str
    is_resolved: bool
    created_at: datetime
    reporter: Optional[ReporterInfo] = None

    class Config:
        from_attributes = True


class PostInfo(BaseModel):
    id: int
    title: str
    is_deleted: bool
    author_nickname: Optional[str] = None

    class Config:
        from_attributes = True


class ReportedPostItem(BaseModel):
    post_id: int
    post_title: str
    post_is_deleted: bool
    author_nickname: Optional[str] = None
    report_count: int
    unresolved_count: int
    latest_report_at: datetime
    reports: List[ReportResponse] = []


class PaginatedReportedPosts(BaseModel):
    items: List[ReportedPostItem]
    total: int
    page: int
    size: int
    pages: int

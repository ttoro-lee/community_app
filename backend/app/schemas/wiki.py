from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Any


# ── 단락 섹션 ─────────────────────────────────────────────────────────────────

class WikiSection(BaseModel):
    heading: str = Field(default="", description="단락 제목 (빈 문자열 = 제목 없음)")
    content: str = Field(default="", description="단락 본문")


# ── 사용자 요약 ───────────────────────────────────────────────────────────────

class WikiUserInfo(BaseModel):
    id: int
    nickname: str
    username: str

    class Config:
        from_attributes = True


# ── 수정본 ────────────────────────────────────────────────────────────────────

class WikiRevisionResponse(BaseModel):
    id: int
    wiki_id: int
    editor_id: Optional[int] = None
    editor: Optional[WikiUserInfo] = None
    sections: List[WikiSection]
    edit_summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WikiRevisionSummary(BaseModel):
    """목록용 수정본 요약 (sections 제외)"""
    id: int
    wiki_id: int
    editor_id: Optional[int] = None
    editor: Optional[WikiUserInfo] = None
    edit_summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── 문서 생성 / 수정 ──────────────────────────────────────────────────────────

class WikiDocumentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    sections: List[WikiSection] = Field(default_factory=list)
    edit_summary: Optional[str] = Field(None, max_length=300)


class WikiDocumentUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    sections: List[WikiSection] = Field(default_factory=list)
    edit_summary: Optional[str] = Field(None, max_length=300)


# ── 문서 응답 ─────────────────────────────────────────────────────────────────

class WikiDocumentResponse(BaseModel):
    id: int
    title: str
    created_by_id: Optional[int] = None
    created_by: Optional[WikiUserInfo] = None
    view_count: int
    is_deleted: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    # 현재 최신 수정본
    latest_revision: Optional[WikiRevisionResponse] = None
    revision_count: int = 0

    class Config:
        from_attributes = True


class WikiDocumentListItem(BaseModel):
    id: int
    title: str
    created_by: Optional[WikiUserInfo] = None
    view_count: int
    revision_count: int
    updated_at: Optional[datetime] = None
    created_at: datetime
    latest_editor: Optional[WikiUserInfo] = None

    class Config:
        from_attributes = True


class PaginatedWikiDocuments(BaseModel):
    items: List[WikiDocumentListItem]
    total: int
    page: int
    size: int
    pages: int

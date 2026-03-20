from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.db.database import get_db
from app.dependencies import get_current_user, get_optional_user
from app.models.user import User
from app.schemas.wiki import (
    WikiDocumentCreate,
    WikiDocumentUpdate,
    WikiDocumentResponse,
    PaginatedWikiDocuments,
    WikiRevisionResponse,
    WikiRevisionSummary,
)
from app.services import wiki_service

router = APIRouter(prefix="/wiki", tags=["Wiki"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    from fastapi import HTTPException
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    return current_user


# ── 문서 목록 ─────────────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedWikiDocuments)
def list_documents(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """위키 문서 목록 (누구나 조회 가능)"""
    return wiki_service.get_documents(db, page, size, search)


# ── 문서 생성 ─────────────────────────────────────────────────────────────────

@router.post("", response_model=WikiDocumentResponse, status_code=201)
def create_document(
    data: WikiDocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """위키 문서 생성 (로그인 필요)"""
    return wiki_service.create_document(db, data, current_user.id)


# ── 문서 단건 조회 ────────────────────────────────────────────────────────────

@router.get("/{wiki_id}", response_model=WikiDocumentResponse)
def get_document(
    wiki_id: int,
    db: Session = Depends(get_db),
):
    """위키 문서 조회 (누구나 가능, 조회수 증가)"""
    return wiki_service.get_document(db, wiki_id, increment_view=True)


# ── 문서 수정 ─────────────────────────────────────────────────────────────────

@router.put("/{wiki_id}", response_model=WikiDocumentResponse)
def update_document(
    wiki_id: int,
    data: WikiDocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """위키 문서 수정 (로그인 필요, 누구나 수정 가능)"""
    return wiki_service.update_document(db, wiki_id, data, current_user.id)


# ── 수정 이력 목록 ────────────────────────────────────────────────────────────

@router.get("/{wiki_id}/revisions", response_model=List[WikiRevisionSummary])
def list_revisions(
    wiki_id: int,
    db: Session = Depends(get_db),
):
    """수정 이력 목록 (누구나 조회 가능)"""
    return wiki_service.get_revisions(db, wiki_id)


# ── 수정본 단건 조회 ──────────────────────────────────────────────────────────

@router.get("/{wiki_id}/revisions/{revision_id}", response_model=WikiRevisionResponse)
def get_revision(
    wiki_id: int,
    revision_id: int,
    db: Session = Depends(get_db),
):
    """특정 수정본 내용 조회"""
    return wiki_service.get_revision(db, wiki_id, revision_id)


# ── 문서 삭제 (관리자) ────────────────────────────────────────────────────────

@router.delete("/{wiki_id}", status_code=204)
def delete_document(
    wiki_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    """위키 문서 삭제 (관리자 전용)"""
    wiki_service.delete_document(db, wiki_id)

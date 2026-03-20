from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional, List

from app.models.wiki import WikiDocument, WikiRevision
from app.models.user import User
from app.schemas.wiki import (
    WikiDocumentCreate,
    WikiDocumentUpdate,
    WikiDocumentResponse,
    WikiDocumentListItem,
    PaginatedWikiDocuments,
    WikiRevisionResponse,
    WikiRevisionSummary,
    WikiUserInfo,
    WikiSection,
)


# ── 내부 헬퍼 ─────────────────────────────────────────────────────────────────

def _user_info(user: Optional[User]) -> Optional[WikiUserInfo]:
    if not user:
        return None
    return WikiUserInfo(id=user.id, nickname=user.nickname, username=user.username)


def _revision_to_response(rev: WikiRevision) -> WikiRevisionResponse:
    sections = [WikiSection(**s) if isinstance(s, dict) else s for s in (rev.sections or [])]
    return WikiRevisionResponse(
        id=rev.id,
        wiki_id=rev.wiki_id,
        editor_id=rev.editor_id,
        editor=_user_info(rev.editor),
        sections=sections,
        edit_summary=rev.edit_summary,
        created_at=rev.created_at,
    )


def _latest_revision(db: Session, wiki_id: int) -> Optional[WikiRevision]:
    return (
        db.query(WikiRevision)
        .filter(WikiRevision.wiki_id == wiki_id)
        .order_by(desc(WikiRevision.id))
        .first()
    )


# ── 문서 목록 ─────────────────────────────────────────────────────────────────

def get_documents(
    db: Session,
    page: int = 1,
    size: int = 20,
    search: Optional[str] = None,
) -> PaginatedWikiDocuments:
    query = db.query(WikiDocument).filter(WikiDocument.is_deleted == False)
    if search:
        query = query.filter(WikiDocument.title.ilike(f"%{search}%"))

    total = query.count()
    docs = (
        query
        .order_by(desc(WikiDocument.updated_at))
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    items = []
    for doc in docs:
        rev_count = db.query(func.count(WikiRevision.id)).filter(WikiRevision.wiki_id == doc.id).scalar() or 0
        latest_rev = _latest_revision(db, doc.id)
        latest_editor = _user_info(latest_rev.editor) if latest_rev else None

        items.append(WikiDocumentListItem(
            id=doc.id,
            title=doc.title,
            created_by=_user_info(doc.created_by),
            view_count=doc.view_count,
            revision_count=rev_count,
            updated_at=doc.updated_at,
            created_at=doc.created_at,
            latest_editor=latest_editor,
        ))

    return PaginatedWikiDocuments(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=max(1, (total + size - 1) // size),
    )


# ── 문서 단건 조회 ────────────────────────────────────────────────────────────

def get_document(db: Session, wiki_id: int, increment_view: bool = True) -> WikiDocumentResponse:
    doc = db.query(WikiDocument).filter(
        WikiDocument.id == wiki_id, WikiDocument.is_deleted == False
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="위키 문서를 찾을 수 없습니다.")

    if increment_view:
        doc.view_count += 1
        db.commit()
        db.refresh(doc)

    rev_count = db.query(func.count(WikiRevision.id)).filter(WikiRevision.wiki_id == wiki_id).scalar() or 0
    latest_rev = _latest_revision(db, wiki_id)

    return WikiDocumentResponse(
        id=doc.id,
        title=doc.title,
        created_by_id=doc.created_by_id,
        created_by=_user_info(doc.created_by),
        view_count=doc.view_count,
        is_deleted=doc.is_deleted,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        latest_revision=_revision_to_response(latest_rev) if latest_rev else None,
        revision_count=rev_count,
    )


# ── 문서 생성 ─────────────────────────────────────────────────────────────────

def create_document(db: Session, data: WikiDocumentCreate, user_id: int) -> WikiDocumentResponse:
    # 동일 제목 중복 방지
    exists = db.query(WikiDocument).filter(
        WikiDocument.title == data.title.strip(), WikiDocument.is_deleted == False
    ).first()
    if exists:
        raise HTTPException(status_code=409, detail="동일한 제목의 문서가 이미 존재합니다.")

    doc = WikiDocument(
        title=data.title.strip(),
        created_by_id=user_id,
    )
    db.add(doc)
    db.flush()

    rev = WikiRevision(
        wiki_id=doc.id,
        editor_id=user_id,
        sections=[s.model_dump() for s in data.sections],
        edit_summary=data.edit_summary or "문서 최초 작성",
    )
    db.add(rev)
    db.commit()
    db.refresh(doc)

    return get_document(db, doc.id, increment_view=False)


# ── 문서 수정 ─────────────────────────────────────────────────────────────────

def update_document(db: Session, wiki_id: int, data: WikiDocumentUpdate, user_id: int) -> WikiDocumentResponse:
    doc = db.query(WikiDocument).filter(
        WikiDocument.id == wiki_id, WikiDocument.is_deleted == False
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="위키 문서를 찾을 수 없습니다.")

    # 제목 변경 시 중복 확인
    new_title = data.title.strip()
    if new_title != doc.title:
        conflict = db.query(WikiDocument).filter(
            WikiDocument.title == new_title,
            WikiDocument.is_deleted == False,
            WikiDocument.id != wiki_id,
        ).first()
        if conflict:
            raise HTTPException(status_code=409, detail="동일한 제목의 문서가 이미 존재합니다.")
        doc.title = new_title

    rev = WikiRevision(
        wiki_id=wiki_id,
        editor_id=user_id,
        sections=[s.model_dump() for s in data.sections],
        edit_summary=data.edit_summary or "내용 수정",
    )
    db.add(rev)
    db.commit()
    db.refresh(doc)

    return get_document(db, wiki_id, increment_view=False)


# ── 수정 이력 목록 ────────────────────────────────────────────────────────────

def get_revisions(db: Session, wiki_id: int) -> List[WikiRevisionSummary]:
    doc = db.query(WikiDocument).filter(WikiDocument.id == wiki_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="위키 문서를 찾을 수 없습니다.")

    revs = (
        db.query(WikiRevision)
        .filter(WikiRevision.wiki_id == wiki_id)
        .order_by(desc(WikiRevision.id))
        .all()
    )
    return [
        WikiRevisionSummary(
            id=r.id,
            wiki_id=r.wiki_id,
            editor_id=r.editor_id,
            editor=_user_info(r.editor),
            edit_summary=r.edit_summary,
            created_at=r.created_at,
        )
        for r in revs
    ]


# ── 수정본 단건 조회 ──────────────────────────────────────────────────────────

def get_revision(db: Session, wiki_id: int, revision_id: int) -> WikiRevisionResponse:
    rev = db.query(WikiRevision).filter(
        WikiRevision.id == revision_id, WikiRevision.wiki_id == wiki_id
    ).first()
    if not rev:
        raise HTTPException(status_code=404, detail="수정본을 찾을 수 없습니다.")
    return _revision_to_response(rev)


# ── 문서 삭제 (관리자 전용) ───────────────────────────────────────────────────

def delete_document(db: Session, wiki_id: int) -> None:
    doc = db.query(WikiDocument).filter(WikiDocument.id == wiki_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="위키 문서를 찾을 수 없습니다.")
    doc.is_deleted = True
    db.commit()

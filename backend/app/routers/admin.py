from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.dependencies import get_current_user, get_super_admin_user
from app.models.user import User
from app.schemas.admin import (
    AdminStatsResponse,
    PaginatedUsers,
    SuspendRequest,
    ToggleAdminRequest,
    UserAdminView,
)
from app.schemas.post import NoticeItem
from app.services import admin_service
from pydantic import BaseModel


class NoticeToggleRequest(BaseModel):
    register: bool   # True=공지 등록, False=공지 해제

router = APIRouter(prefix="/admin", tags=["Admin"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    from fastapi import HTTPException
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    return current_user


# ─── 통계 ────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStatsResponse)
def get_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    return admin_service.get_stats(db)


# ─── 유저 목록 ────────────────────────────────────────────────────────────────

@router.get("/users", response_model=PaginatedUsers)
def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    return admin_service.get_users(db, page, size, search)


# ─── 관리자 권한 토글 (슈퍼 관리자 전용) ──────────────────────────────────────

@router.patch("/users/{user_id}/admin", response_model=UserAdminView)
def toggle_admin(
    user_id: int,
    body: ToggleAdminRequest,
    db: Session = Depends(get_db),
    super_admin: User = Depends(get_super_admin_user),
):
    user = admin_service.toggle_admin(db, user_id, body.is_admin, super_admin)
    return {
        **user.__dict__,
        "post_count": 0,
        "comment_count": 0,
    }


# ─── 활동 정지 설정 ───────────────────────────────────────────────────────────

@router.post("/users/{user_id}/suspend", response_model=UserAdminView)
def suspend_user(
    user_id: int,
    body: SuspendRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    user = admin_service.suspend_user(db, user_id, body.days, body.reason, admin)
    return {
        **user.__dict__,
        "post_count": 0,
        "comment_count": 0,
    }


# ─── 공지 등록 / 해제 ─────────────────────────────────────────────────────────

@router.patch("/posts/{post_id}/notice", response_model=NoticeItem)
def toggle_notice(
    post_id: int,
    body: NoticeToggleRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    post = admin_service.toggle_notice(db, post_id, body.register, admin)
    return post


# ─── 게시글 강제 삭제 ─────────────────────────────────────────────────────────

@router.delete("/posts/{post_id}", status_code=204)
def admin_delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    admin_service.admin_delete_post(db, post_id)


# ─── 댓글 강제 삭제 ───────────────────────────────────────────────────────────

@router.delete("/comments/{comment_id}", status_code=204)
def admin_delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    admin_service.admin_delete_comment(db, comment_id)

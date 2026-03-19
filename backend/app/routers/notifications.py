from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.schemas.notification import NotificationResponse, UnreadCountResponse
from app.services import notification_service
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """내 알림 목록 조회"""
    return notification_service.get_notifications(db, current_user.id, unread_only, limit)


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """읽지 않은 알림 수"""
    count = notification_service.get_unread_count(db, current_user.id)
    return {"count": count}


@router.post("/{notification_id}/read", status_code=200)
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """알림 단건 읽음 처리"""
    notification_service.mark_as_read(db, notification_id, current_user.id)
    return {"message": "읽음 처리 완료"}


@router.post("/read-all", status_code=200)
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """알림 전체 읽음 처리"""
    notification_service.mark_all_as_read(db, current_user.id)
    return {"message": "전체 읽음 처리 완료"}

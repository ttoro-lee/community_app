from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse
from fastapi import HTTPException
from typing import List


def create_notification(
    db: Session,
    user_id: int,
    actor_id: int,
    ntype: str,
    post_id: int,
    comment_id: int,
) -> None:
    """알림 생성 (자기 자신에게는 생성하지 않음)"""
    if user_id == actor_id:
        return
    notif = Notification(
        user_id=user_id,
        actor_id=actor_id,
        type=ntype,
        post_id=post_id,
        comment_id=comment_id,
    )
    db.add(notif)
    db.commit()


def get_notifications(
    db: Session,
    user_id: int,
    unread_only: bool = False,
    limit: int = 30,
) -> List[NotificationResponse]:
    query = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
    )
    if unread_only:
        query = query.filter(Notification.is_read == False)
    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
    return [_to_response(n) for n in notifications]


def get_unread_count(db: Session, user_id: int) -> int:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)
        .count()
    )


def mark_as_read(db: Session, notification_id: int, user_id: int) -> None:
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="알림을 찾을 수 없습니다.")
    notif.is_read = True
    db.commit()


def mark_all_as_read(db: Session, user_id: int) -> None:
    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()


def _to_response(n: Notification) -> NotificationResponse:
    return NotificationResponse(
        id=n.id,
        type=n.type,
        actor_nickname=n.actor.nickname if n.actor else None,
        actor_avatar_url=n.actor.avatar_url if n.actor else None,
        post_id=n.post_id,
        post_title=n.post.title if n.post and not n.post.is_deleted else None,
        comment_id=n.comment_id,
        is_read=n.is_read,
        created_at=n.created_at,
    )

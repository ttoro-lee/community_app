from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services import like_service
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/likes", tags=["Likes"])


@router.post("/posts/{post_id}")
def toggle_post_like(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """게시글 좋아요 토글"""
    return like_service.toggle_post_like(db, post_id, current_user.id)


@router.post("/comments/{comment_id}")
def toggle_comment_like(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """댓글 좋아요 토글"""
    return like_service.toggle_comment_like(db, comment_id, current_user.id)

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.schemas.comment import CommentCreate, CommentUpdate, CommentResponse
from app.services import comment_service
from app.dependencies import get_current_user, get_optional_user
from app.models.user import User

router = APIRouter(prefix="/comments", tags=["Comments"])


@router.get("", response_model=List[CommentResponse])
def get_comments(
    post_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """게시글 댓글 목록"""
    user_id = current_user.id if current_user else None
    return comment_service.get_comments_by_post(db, post_id, user_id)


@router.post("", response_model=CommentResponse, status_code=201)
def create_comment(
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """댓글 작성"""
    comment = comment_service.create_comment(db, comment_data, current_user.id)
    return {
        "id": comment.id,
        "content": comment.content,
        "user_id": comment.user_id,
        "post_id": comment.post_id,
        "parent_id": comment.parent_id,
        "is_deleted": comment.is_deleted,
        "created_at": comment.created_at,
        "updated_at": comment.updated_at,
        "author": comment.author,
        "replies": [],
        "like_count": 0,
        "is_liked": False,
    }


@router.put("/{comment_id}", response_model=CommentResponse)
def update_comment(
    comment_id: int,
    comment_data: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """댓글 수정"""
    comment = comment_service.update_comment(db, comment_id, comment_data, current_user.id)
    return {
        "id": comment.id,
        "content": comment.content,
        "user_id": comment.user_id,
        "post_id": comment.post_id,
        "parent_id": comment.parent_id,
        "is_deleted": comment.is_deleted,
        "created_at": comment.created_at,
        "updated_at": comment.updated_at,
        "author": comment.author,
        "replies": [],
        "like_count": 0,
        "is_liked": False,
    }


@router.delete("/{comment_id}", status_code=204)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """댓글 삭제"""
    comment_service.delete_comment(db, comment_id, current_user.id)

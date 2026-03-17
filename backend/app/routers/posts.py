from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.schemas.post import PostCreate, PostUpdate, PostResponse, PaginatedPosts, NoticeItem
from app.services import post_service
from app.services import admin_service
from app.dependencies import get_current_user, get_optional_user
from app.models.user import User

router = APIRouter(prefix="/posts", tags=["Posts"])


@router.get("", response_model=PaginatedPosts)
def get_posts(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """게시글 목록 조회"""
    user_id = current_user.id if current_user else None
    return post_service.get_posts(db, page, size, category_id, search, user_id)


# !! /notices 는 /{post_id} 보다 반드시 앞에 선언해야 함
# FastAPI는 선언 순서대로 경로를 매칭하므로, 뒤에 두면
# "notices"가 정수 post_id로 파싱되어 422 에러 발생
@router.get("/notices", response_model=List[NoticeItem])
def get_notices(db: Session = Depends(get_db)):
    """공지사항 목록 조회 (최대 10개, 로그인 불필요)"""
    return admin_service.get_notices(db)


@router.get("/{post_id}", response_model=PostResponse)
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """게시글 상세 조회"""
    user_id = current_user.id if current_user else None
    post, like_count, comment_count, is_liked = post_service.get_post_by_id(db, post_id, user_id)
    return {
        "id": post.id,
        "title": post.title,
        "content": post.content,
        "user_id": post.user_id,
        "category_id": post.category_id,
        "view_count": post.view_count,
        "is_pinned": post.is_pinned,
        "is_notice": post.is_notice,
        "original_category_id": post.original_category_id,
        "created_at": post.created_at,
        "updated_at": post.updated_at,
        "author": post.author,
        "category": post.category,
        "like_count": like_count,
        "comment_count": comment_count,
        "is_liked": is_liked,
    }


@router.post("", response_model=PostResponse, status_code=201)
def create_post(
    post_data: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """게시글 작성"""
    post = post_service.create_post(db, post_data, current_user.id, is_admin=current_user.is_admin)
    return {
        "id": post.id,
        "title": post.title,
        "content": post.content,
        "user_id": post.user_id,
        "category_id": post.category_id,
        "view_count": post.view_count,
        "is_pinned": post.is_pinned,
        "is_notice": post.is_notice,
        "original_category_id": post.original_category_id,
        "created_at": post.created_at,
        "updated_at": post.updated_at,
        "author": post.author,
        "category": post.category,
        "like_count": 0,
        "comment_count": 0,
        "is_liked": False,
    }


@router.put("/{post_id}", response_model=PostResponse)
def update_post(
    post_id: int,
    post_data: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """게시글 수정"""
    post = post_service.update_post(db, post_id, post_data, current_user.id)
    return {
        "id": post.id,
        "title": post.title,
        "content": post.content,
        "user_id": post.user_id,
        "category_id": post.category_id,
        "view_count": post.view_count,
        "is_pinned": post.is_pinned,
        "is_notice": post.is_notice,
        "original_category_id": post.original_category_id,
        "created_at": post.created_at,
        "updated_at": post.updated_at,
        "author": post.author,
        "category": post.category,
        "like_count": 0,
        "comment_count": 0,
        "is_liked": False,
    }


@router.delete("/{post_id}", status_code=204)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """게시글 삭제"""
    post_service.delete_post(db, post_id, current_user.id)

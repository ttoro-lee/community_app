from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from fastapi import HTTPException, status
from app.models.post import Post
from app.models.like import Like
from app.models.comment import Comment
from app.models.category import Category
from app.models.report import Report
from app.schemas.post import PostCreate, PostUpdate
from typing import Optional
import math


def get_posts(
    db: Session,
    page: int = 1,
    size: int = 20,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    current_user_id: Optional[int] = None,
):
    query = db.query(Post).filter(Post.is_deleted == False)

    if category_id:
        query = query.filter(Post.category_id == category_id)

    if search:
        query = query.filter(
            Post.title.ilike(f"%{search}%") | Post.content.ilike(f"%{search}%")
        )

    total = query.count()
    posts = (
        query.order_by(desc(Post.is_pinned), desc(Post.created_at))
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    # Attach counts
    result = []
    for post in posts:
        like_count = db.query(func.count(Like.id)).filter(Like.post_id == post.id).scalar()
        comment_count = db.query(func.count(Comment.id)).filter(
            Comment.post_id == post.id, Comment.is_deleted == False
        ).scalar()
        post_dict = {
            "id": post.id,
            "title": post.title,
            "content": post.content,
            "user_id": post.user_id,
            "view_count": post.view_count,
            "is_pinned": post.is_pinned,
            "created_at": post.created_at,
            "author": post.author,
            "category": post.category,
            "like_count": like_count,
            "comment_count": comment_count,
        }
        result.append(post_dict)

    return {
        "items": result,
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if total > 0 else 1,
    }


def get_post_by_id(db: Session, post_id: int, current_user_id: Optional[int] = None):
    post = db.query(Post).filter(Post.id == post_id, Post.is_deleted == False).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    # Increment view count
    post.view_count += 1
    db.commit()
    db.refresh(post)

    like_count = db.query(func.count(Like.id)).filter(Like.post_id == post_id).scalar()
    comment_count = db.query(func.count(Comment.id)).filter(
        Comment.post_id == post_id, Comment.is_deleted == False
    ).scalar()
    is_liked = False
    is_reported = False
    if current_user_id:
        is_liked = (
            db.query(Like)
            .filter(Like.post_id == post_id, Like.user_id == current_user_id)
            .first()
        ) is not None
        is_reported = (
            db.query(Report)
            .filter(Report.post_id == post_id, Report.reporter_id == current_user_id)
            .first()
        ) is not None

    return post, like_count, comment_count, is_liked, is_reported


def create_post(db: Session, post_data: PostCreate, user_id: int, is_admin: bool = False) -> Post:
    # admin_only 카테고리는 관리자만 작성 가능
    is_notice = False
    if post_data.category_id:
        category = db.query(Category).filter(Category.id == post_data.category_id).first()
        if category and category.admin_only and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 카테고리는 관리자만 글을 작성할 수 있습니다.",
            )
        # admin_only 카테고리(공지사항)에 관리자가 작성하면 자동으로 공지 등록
        if category and category.admin_only and is_admin:
            from app.services.admin_service import NOTICE_MAX
            current_count = db.query(func.count(Post.id)).filter(
                Post.is_notice == True, Post.is_deleted == False
            ).scalar()
            if current_count < NOTICE_MAX:
                is_notice = True

    post = Post(
        title=post_data.title,
        content=post_data.content,
        category_id=post_data.category_id,
        user_id=user_id,
        is_notice=is_notice,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


def update_post(db: Session, post_id: int, post_data: PostUpdate, user_id: int) -> Post:
    post = db.query(Post).filter(Post.id == post_id, Post.is_deleted == False).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    if post.user_id != user_id:
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")

    update_dict = post_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(post, key, value)
    db.commit()
    db.refresh(post)
    return post


def build_post_list_item(post: Post, db: Session, current_user=None) -> dict:
    """Post 객체를 PostListResponse 형태의 dict로 변환"""
    like_count = db.query(func.count(Like.id)).filter(Like.post_id == post.id).scalar()
    comment_count = db.query(func.count(Comment.id)).filter(
        Comment.post_id == post.id, Comment.is_deleted == False
    ).scalar()
    return {
        "id": post.id,
        "title": post.title,
        "content": post.content,
        "user_id": post.user_id,
        "view_count": post.view_count,
        "is_pinned": post.is_pinned,
        "is_notice": post.is_notice,
        "created_at": post.created_at,
        "author": post.author,
        "category": post.category,
        "like_count": like_count,
        "comment_count": comment_count,
    }


def get_adjacent_posts(db: Session, post_id: int):
    post = db.query(Post).filter(Post.id == post_id, Post.is_deleted == False).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    base_query = db.query(Post).filter(Post.is_deleted == False, Post.is_notice == False)
    if post.category_id:
        base_query = base_query.filter(Post.category_id == post.category_id)

    prev_post = base_query.filter(Post.id < post_id).order_by(desc(Post.id)).first()
    next_post = base_query.filter(Post.id > post_id).order_by(Post.id).first()
    return prev_post, next_post


def delete_post(db: Session, post_id: int, user_id: int) -> None:
    post = db.query(Post).filter(Post.id == post_id, Post.is_deleted == False).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    if post.user_id != user_id:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    post.is_deleted = True
    db.commit()

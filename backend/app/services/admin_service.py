from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from datetime import datetime, timedelta, timezone
import math

from app.models.user import User
from app.models.post import Post
from app.models.comment import Comment
from app.models.category import Category
from app.models.like import Like
from app.models.settings import SiteSettings

NOTICE_MAX = 10   # 동시에 등록 가능한 최대 공지 수


# ─── 통계 ────────────────────────────────────────────────────────────────────

def get_stats(db: Session) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "total_users": db.query(func.count(User.id)).scalar(),
        "total_posts": db.query(func.count(Post.id)).filter(Post.is_deleted == False).scalar(),
        "total_comments": db.query(func.count(Comment.id)).filter(Comment.is_deleted == False).scalar(),
        "suspended_users": db.query(func.count(User.id)).filter(
            User.suspended_until != None,
            User.suspended_until > now,
        ).scalar(),
        "admin_users": db.query(func.count(User.id)).filter(User.is_admin == True).scalar(),
    }


# ─── 유저 목록 ────────────────────────────────────────────────────────────────

def get_users(db: Session, page: int = 1, size: int = 20, search: str = None) -> dict:
    query = db.query(User)
    if search:
        query = query.filter(
            User.username.ilike(f"%{search}%") | User.nickname.ilike(f"%{search}%")
        )
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size).all()

    items = []
    for u in users:
        post_count = db.query(func.count(Post.id)).filter(Post.user_id == u.id, Post.is_deleted == False).scalar()
        comment_count = db.query(func.count(Comment.id)).filter(Comment.user_id == u.id, Comment.is_deleted == False).scalar()
        items.append({
            "id": u.id,
            "username": u.username,
            "nickname": u.nickname,
            "email": u.email,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "is_super_admin": u.is_super_admin,
            "suspended_until": u.suspended_until,
            "suspend_reason": u.suspend_reason,
            "created_at": u.created_at,
            "post_count": post_count,
            "comment_count": comment_count,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if total > 0 else 1,
    }


# ─── 관리자 권한 토글 ─────────────────────────────────────────────────────────

def toggle_admin(db: Session, target_id: int, is_admin: bool, actor: User) -> User:
    target = db.query(User).filter(User.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if target.is_super_admin:
        raise HTTPException(status_code=403, detail="슈퍼 관리자의 권한은 변경할 수 없습니다.")
    if target.id == actor.id:
        raise HTTPException(status_code=400, detail="자신의 관리자 권한은 변경할 수 없습니다.")

    target.is_admin = is_admin
    db.commit()
    db.refresh(target)
    return target


# ─── 활동 정지 ────────────────────────────────────────────────────────────────

def suspend_user(db: Session, target_id: int, days: int, reason: str | None, actor: User) -> User:
    target = db.query(User).filter(User.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if target.is_super_admin:
        raise HTTPException(status_code=403, detail="슈퍼 관리자는 정지할 수 없습니다.")
    if target.id == actor.id:
        raise HTTPException(status_code=400, detail="자신을 정지할 수 없습니다.")
    # 일반 관리자는 다른 관리자를 정지 불가 (슈퍼 관리자만 가능)
    if target.is_admin and not actor.is_super_admin:
        raise HTTPException(status_code=403, detail="관리자는 슈퍼 관리자만 정지할 수 있습니다.")

    if days <= 0:
        # 정지 해제
        target.suspended_until = None
        target.suspend_reason = None
    else:
        target.suspended_until = datetime.now(timezone.utc) + timedelta(days=days)
        target.suspend_reason = reason

    db.commit()
    db.refresh(target)
    return target


# ─── 공지 등록 / 해제 ─────────────────────────────────────────────────────────

def toggle_notice(db: Session, post_id: int, register: bool, actor: User) -> Post:
    post = db.query(Post).filter(Post.id == post_id, Post.is_deleted == False).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    if register:
        if post.is_notice:
            return post
        current_count = db.query(func.count(Post.id)).filter(
            Post.is_notice == True, Post.is_deleted == False
        ).scalar()
        if current_count >= NOTICE_MAX:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"공지사항은 최대 {NOTICE_MAX}개까지만 등록할 수 있습니다.",
            )
        notice_cat = db.query(Category).filter(Category.slug == "notice").first()
        post.original_category_id = post.category_id
        post.category_id = notice_cat.id if notice_cat else post.category_id
        post.is_notice = True
    else:
        post.is_notice = False
        if post.original_category_id is not None:
            post.category_id = post.original_category_id
        post.original_category_id = None

    db.commit()
    db.refresh(post)
    return post


def get_notices(db: Session) -> list:
    return (
        db.query(Post)
        .filter(Post.is_notice == True, Post.is_deleted == False)
        .order_by(Post.created_at.desc())
        .limit(NOTICE_MAX)
        .all()
    )


# ─── 게시글/댓글 강제 삭제 ────────────────────────────────────────────────────

def admin_delete_post(db: Session, post_id: int) -> None:
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    post.is_deleted = True
    db.commit()


def admin_delete_comment(db: Session, comment_id: int) -> None:
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다.")
    comment.is_deleted = True
    db.commit()


# ─── 사이트 설정 ──────────────────────────────────────────────────────────────

def get_site_setting(db: Session, key: str, default: str = "") -> str:
    setting = db.query(SiteSettings).filter(SiteSettings.key == key).first()
    return setting.value if setting else default


def set_site_setting(db: Session, key: str, value: str) -> SiteSettings:
    setting = db.query(SiteSettings).filter(SiteSettings.key == key).first()
    if setting:
        setting.value = value
    else:
        setting = SiteSettings(key=key, value=value)
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


def get_best_post_threshold(db: Session) -> int:
    return int(get_site_setting(db, "best_post_min_likes", "10"))


def set_best_post_threshold(db: Session, threshold: int) -> int:
    if threshold < 1:
        raise HTTPException(status_code=400, detail="최소 좋아요 수는 1 이상이어야 합니다.")
    set_site_setting(db, "best_post_min_likes", str(threshold))
    return threshold


def get_best_posts(
    db: Session,
    page: int = 1,
    size: int = 20,
    current_user_id: int = None,
) -> dict:
    threshold = get_best_post_threshold(db)

    # 좋아요 수가 threshold 이상인 공지 제외 게시글 조회
    like_count_subq = (
        db.query(Like.post_id, func.count(Like.id).label("like_count"))
        .group_by(Like.post_id)
        .subquery()
    )

    query = (
        db.query(Post)
        .outerjoin(like_count_subq, Post.id == like_count_subq.c.post_id)
        .filter(
            Post.is_deleted == False,
            Post.is_notice == False,
            func.coalesce(like_count_subq.c.like_count, 0) >= threshold,
        )
    )

    total = query.count()
    posts = (
        query
        .order_by(
            func.coalesce(like_count_subq.c.like_count, 0).desc(),
            Post.created_at.desc(),
        )
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    result = []
    for post in posts:
        lc = db.query(func.count(Like.id)).filter(Like.post_id == post.id).scalar()
        cc = db.query(func.count(Comment.id)).filter(
            Comment.post_id == post.id, Comment.is_deleted == False
        ).scalar()
        result.append({
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
            "like_count": lc,
            "comment_count": cc,
        })

    return {
        "items": result,
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if total > 0 else 1,
    }


# ─── 슈퍼 관리자 초기 생성 ───────────────────────────────────────────────────

def seed_super_admin(db: Session, username: str, email: str, password: str, nickname: str) -> None:
    from app.core.security import get_password_hash
    existing = db.query(User).filter(
        (User.username == username) | (User.email == email)
    ).first()
    if existing:
        # 이미 존재하면 슈퍼 어드민 플래그만 보장
        if not existing.is_super_admin:
            existing.is_super_admin = True
            existing.is_admin = True
            db.commit()
        return

    super_admin = User(
        username=username,
        email=email,
        nickname=nickname,
        hashed_password=get_password_hash(password),
        is_admin=True,
        is_super_admin=True,
    )
    db.add(super_admin)
    db.commit()

from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from app.models.comment import Comment
from app.models.like import Like
from app.models.post import Post
from app.schemas.comment import CommentCreate, CommentUpdate
from typing import Optional, List


def get_comments_by_post(
    db: Session, post_id: int, current_user_id: Optional[int] = None
) -> List[dict]:
    # 최상위 댓글만 가져오고, 트리는 재귀로 구축
    comments = (
        db.query(Comment)
        .filter(
            Comment.post_id == post_id,
            Comment.parent_id == None,
        )
        .order_by(Comment.created_at)
        .all()
    )

    def build_comment(comment: Comment) -> dict:
        like_count = db.query(func.count(Like.id)).filter(Like.comment_id == comment.id).scalar()
        is_liked = False
        if current_user_id:
            is_liked = (
                db.query(Like)
                .filter(Like.comment_id == comment.id, Like.user_id == current_user_id)
                .first()
            ) is not None

        # 삭제 여부 관계없이 모든 대댓글 포함 (삭제된 경우 "삭제된 댓글입니다." 표시)
        replies = []
        for reply in sorted(comment.replies, key=lambda r: r.created_at):
            replies.append(build_comment(reply))

        return {
            "id": comment.id,
            "content": comment.content if not comment.is_deleted else "삭제된 댓글입니다.",
            "user_id": comment.user_id,
            "post_id": comment.post_id,
            "parent_id": comment.parent_id,
            "is_deleted": comment.is_deleted,
            "created_at": comment.created_at,
            "updated_at": comment.updated_at,
            "author": comment.author,
            "replies": replies,
            "like_count": like_count,
            "is_liked": is_liked,
        }

    return [build_comment(c) for c in comments]


def create_comment(db: Session, comment_data: CommentCreate, user_id: int) -> Comment:
    parent = None
    if comment_data.parent_id:
        parent = db.query(Comment).filter(Comment.id == comment_data.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="부모 댓글을 찾을 수 없습니다.")
        # 깊이 제한 없음 — 어느 댓글에나 대댓글 가능

    comment = Comment(
        content=comment_data.content,
        post_id=comment_data.post_id,
        parent_id=comment_data.parent_id,
        user_id=user_id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # ── 알림 생성 ──────────────────────────────────────────────────────────────
    _create_comment_notifications(db, comment, parent, user_id)

    return comment


def _create_comment_notifications(
    db: Session, comment: Comment, parent: Optional[Comment], actor_id: int
) -> None:
    """댓글/대댓글 작성 시 관련 유저에게 알림을 생성한다."""
    from app.services.notification_service import create_notification

    notified: set = set()
    post_id = comment.post_id

    # 대댓글인 경우 — 부모 댓글 작성자에게 알림
    if parent is not None and parent.user_id != actor_id:
        create_notification(db, parent.user_id, actor_id, "reply_on_comment", post_id, comment.id)
        notified.add(parent.user_id)

    # 게시글 작성자에게 알림 (이미 위에서 알림 받은 경우 제외)
    post = db.query(Post).filter(Post.id == post_id).first()
    if post and post.user_id != actor_id and post.user_id not in notified:
        create_notification(db, post.user_id, actor_id, "comment_on_post", post_id, comment.id)
        notified.add(post.user_id)


def update_comment(db: Session, comment_id: int, comment_data: CommentUpdate, user_id: int) -> Comment:
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.is_deleted == False).first()
    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다.")
    if comment.user_id != user_id:
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")

    comment.content = comment_data.content
    db.commit()
    db.refresh(comment)
    return comment


def delete_comment(db: Session, comment_id: int, user_id: int) -> None:
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.is_deleted == False).first()
    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다.")
    if comment.user_id != user_id:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    comment.is_deleted = True
    db.commit()

from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from app.models.like import Like
from app.models.post import Post
from app.models.comment import Comment
from typing import Optional


def toggle_post_like(db: Session, post_id: int, user_id: int) -> dict:
    post = db.query(Post).filter(Post.id == post_id, Post.is_deleted == False).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    existing = db.query(Like).filter(
        Like.post_id == post_id, Like.user_id == user_id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        liked = False
    else:
        like = Like(post_id=post_id, user_id=user_id)
        db.add(like)
        db.commit()
        liked = True

    count = db.query(func.count(Like.id)).filter(Like.post_id == post_id).scalar()
    return {"liked": liked, "count": count}


def toggle_comment_like(db: Session, comment_id: int, user_id: int) -> dict:
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.is_deleted == False).first()
    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다.")

    existing = db.query(Like).filter(
        Like.comment_id == comment_id, Like.user_id == user_id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        liked = False
    else:
        like = Like(comment_id=comment_id, user_id=user_id)
        db.add(like)
        db.commit()
        liked = True

    count = db.query(func.count(Like.id)).filter(Like.comment_id == comment_id).scalar()
    return {"liked": liked, "count": count}

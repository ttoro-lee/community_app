from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.emoticon import Emoticon


def list_emoticons(db: Session):
    """활성화된 이모티콘 목록 (일반 유저용)"""
    return (
        db.query(Emoticon)
        .filter(Emoticon.is_active == True)
        .order_by(Emoticon.created_at.desc())
        .all()
    )


def list_all_emoticons(db: Session):
    """전체 이모티콘 목록 (관리자용)"""
    return db.query(Emoticon).order_by(Emoticon.created_at.desc()).all()


def create_emoticon(db: Session, name: str, image_url: str) -> Emoticon:
    emoticon = Emoticon(name=name, image_url=image_url)
    db.add(emoticon)
    db.commit()
    db.refresh(emoticon)
    return emoticon


def delete_emoticon(db: Session, emoticon_id: int):
    emoticon = db.query(Emoticon).filter(Emoticon.id == emoticon_id).first()
    if not emoticon:
        raise HTTPException(status_code=404, detail="이모티콘을 찾을 수 없습니다.")
    db.delete(emoticon)
    db.commit()


def toggle_emoticon(db: Session, emoticon_id: int) -> Emoticon:
    emoticon = db.query(Emoticon).filter(Emoticon.id == emoticon_id).first()
    if not emoticon:
        raise HTTPException(status_code=404, detail="이모티콘을 찾을 수 없습니다.")
    emoticon.is_active = not emoticon.is_active
    db.commit()
    db.refresh(emoticon)
    return emoticon

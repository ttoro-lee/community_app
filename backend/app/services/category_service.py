from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from app.models.category import Category
from app.models.post import Post
from app.schemas.category import CategoryCreate, CategoryUpdate


def get_all_categories(db: Session):
    categories = (
        db.query(Category)
        .filter(Category.is_active == True)
        .order_by(Category.order)
        .all()
    )
    result = []
    for cat in categories:
        count = db.query(func.count(Post.id)).filter(
            Post.category_id == cat.id, Post.is_deleted == False
        ).scalar()
        result.append({
            "id": cat.id,
            "name": cat.name,
            "slug": cat.slug,
            "description": cat.description,
            "icon": cat.icon,
            "order": cat.order,
            "is_active": cat.is_active,
            "admin_only": cat.admin_only,
            "created_at": cat.created_at,
            "post_count": count,
        })
    return result


def get_category_by_slug(db: Session, slug: str) -> Category:
    cat = db.query(Category).filter(Category.slug == slug, Category.is_active == True).first()
    if not cat:
        raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다.")
    return cat


def create_category(db: Session, data: CategoryCreate) -> Category:
    existing = db.query(Category).filter(Category.slug == data.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 존재하는 슬러그입니다.")
    cat = Category(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def seed_default_categories(db: Session):
    defaults = [
        {"name": "자유게시판", "slug": "free", "description": "자유롭게 이야기 나눠요", "icon": "💬", "order": 1, "admin_only": False},
        {"name": "질문/답변", "slug": "qna", "description": "궁금한 것을 질문하세요", "icon": "❓", "order": 2, "admin_only": False},
        {"name": "정보/공유", "slug": "info", "description": "유용한 정보를 공유해요", "icon": "📢", "order": 3, "admin_only": False},
        {"name": "공지사항", "slug": "notice", "description": "중요한 공지사항", "icon": "📌", "order": 0, "admin_only": True},
    ]
    for d in defaults:
        existing = db.query(Category).filter(Category.slug == d["slug"]).first()
        if not existing:
            db.add(Category(**d))
        else:
            # admin_only 플래그가 달라진 경우 업데이트 (기존 DB에 잘못 저장된 경우 보정)
            if existing.admin_only != d["admin_only"]:
                existing.admin_only = d["admin_only"]
    db.commit()

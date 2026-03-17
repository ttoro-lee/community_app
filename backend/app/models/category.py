from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True, default="📋")
    is_active = Column(Boolean, default=True)
    admin_only = Column(Boolean, default=False)   # True이면 관리자만 글 작성 가능
    order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    posts = relationship("Post", back_populates="category", foreign_keys="Post.category_id")

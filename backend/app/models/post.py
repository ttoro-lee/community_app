from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    view_count = Column(Integer, default=0)
    is_pinned = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    is_notice = Column(Boolean, default=False)
    original_category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    author = relationship("User", back_populates="posts")
    category = relationship(
        "Category",
        back_populates="posts",
        foreign_keys=[category_id],
    )
    original_category = relationship(
        "Category",
        foreign_keys=[original_category_id],
    )
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan")

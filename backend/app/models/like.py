from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=True)
    comment_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Unique constraints
    __table_args__ = (
        UniqueConstraint("user_id", "post_id", name="unique_user_post_like"),
        UniqueConstraint("user_id", "comment_id", name="unique_user_comment_like"),
    )

    # Relationships
    user = relationship("User", back_populates="likes")
    post = relationship("Post", back_populates="likes")
    comment = relationship("Comment", back_populates="likes")

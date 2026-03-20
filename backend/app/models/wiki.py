from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class WikiDocument(Base):
    __tablename__ = "wiki_documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    view_count = Column(Integer, default=0)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    revisions = relationship(
        "WikiRevision",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="WikiRevision.id",
    )


class WikiRevision(Base):
    """
    위키 문서의 각 수정본을 저장한다.
    sections: JSON 배열  [ { heading: str, content: str }, ... ]
      - heading: 단락 제목 (빈 문자열이면 제목 없는 본문 단락)
      - content: 단락 본문 (하이퍼링크 마크다운 [텍스트](url) 포함 가능)
    """
    __tablename__ = "wiki_revisions"

    id = Column(Integer, primary_key=True, index=True)
    wiki_id = Column(Integer, ForeignKey("wiki_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    editor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    sections = Column(JSON, nullable=False, default=list)
    edit_summary = Column(String(300), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    document = relationship("WikiDocument", back_populates="revisions")
    editor = relationship("User", foreign_keys=[editor_id])

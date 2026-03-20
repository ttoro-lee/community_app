from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Arena(Base):
    __tablename__ = "arenas"

    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    opponent_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    duration_minutes = Column(Integer, nullable=False)   # 5·10·15·20·25·30
    # pending → active → finished  /  pending → declined
    status = Column(String(20), default="pending", nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    ends_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", foreign_keys=[creator_id])
    opponent = relationship("User", foreign_keys=[opponent_id])
    messages = relationship(
        "ArenaMessage",
        back_populates="arena",
        cascade="all, delete-orphan",
        order_by="ArenaMessage.created_at",
    )
    votes = relationship("ArenaVote", back_populates="arena", cascade="all, delete-orphan")


class ArenaMessage(Base):
    __tablename__ = "arena_messages"

    id = Column(Integer, primary_key=True, index=True)
    arena_id = Column(Integer, ForeignKey("arenas.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    arena = relationship("Arena", back_populates="messages")
    user = relationship("User")


class ArenaVote(Base):
    __tablename__ = "arena_votes"

    id = Column(Integer, primary_key=True, index=True)
    arena_id = Column(Integer, ForeignKey("arenas.id", ondelete="CASCADE"), nullable=False, index=True)
    voter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    voted_for_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("arena_id", "voter_id", name="uq_arena_vote_per_user"),
    )

    arena = relationship("Arena", back_populates="votes")
    voter = relationship("User", foreign_keys=[voter_id])
    voted_for = relationship("User", foreign_keys=[voted_for_id])

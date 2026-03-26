from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class AppleArenaRoom(Base):
    __tablename__ = "apple_arena_rooms"

    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), default="waiting", nullable=False, index=True)  # waiting / playing / finished
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)

    creator = relationship("User", foreign_keys=[creator_id])
    players = relationship(
        "AppleArenaPlayer",
        back_populates="room",
        cascade="all, delete-orphan",
        order_by="AppleArenaPlayer.joined_at",
    )


class AppleArenaPlayer(Base):
    __tablename__ = "apple_arena_players"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("apple_arena_rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    is_ready = Column(Boolean, default=False, nullable=False)
    score = Column(Integer, default=0, nullable=False)
    board = Column(Text, nullable=True)      # JSON: [[...17cols × 10rows...]]
    snapshots = Column(Text, nullable=True)  # JSON: [{second, cleared:[{r,c}...], score}]
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    room = relationship("AppleArenaRoom", back_populates="players")
    user = relationship("User")

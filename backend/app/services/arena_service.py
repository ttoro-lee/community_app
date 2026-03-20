import math
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.arena import Arena, ArenaMessage, ArenaVote
from app.models.notification import Notification
from app.models.user import User


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── 아레나 생성 ───────────────────────────────────────────────────────────────

def create_arena(
    db: Session,
    creator_id: int,
    opponent_id: int,
    duration_minutes: int,
) -> Arena:
    if creator_id == opponent_id:
        raise HTTPException(400, "자기 자신과 아레나를 시작할 수 없습니다.")

    opponent = db.query(User).filter(User.id == opponent_id, User.is_active == True).first()
    if not opponent:
        raise HTTPException(404, "상대 유저를 찾을 수 없습니다.")

    # 두 유저 중 누구라도 이미 pending/active 상태의 아레나에 있으면 차단
    active = (
        db.query(Arena)
        .filter(
            Arena.status.in_(["pending", "active"]),
            (
                (Arena.creator_id == creator_id)
                | (Arena.opponent_id == creator_id)
                | (Arena.creator_id == opponent_id)
                | (Arena.opponent_id == opponent_id)
            ),
        )
        .first()
    )
    if active:
        raise HTTPException(400, "이미 진행 중이거나 대기 중인 아레나가 있습니다.")

    arena = Arena(
        creator_id=creator_id,
        opponent_id=opponent_id,
        duration_minutes=duration_minutes,
        status="pending",
    )
    db.add(arena)
    db.flush()  # arena.id 확보

    # 아레나 초대 알림
    notif = Notification(
        user_id=opponent_id,
        actor_id=creator_id,
        type="arena_invite",
        arena_id=arena.id,
    )
    db.add(notif)
    db.commit()
    db.refresh(arena)
    return arena


# ── 수락 / 거절 ───────────────────────────────────────────────────────────────

def accept_arena(db: Session, arena_id: int, user_id: int) -> Arena:
    arena = _get_or_404(db, arena_id)
    if arena.opponent_id != user_id:
        raise HTTPException(403, "아레나 초대를 받은 유저만 수락할 수 있습니다.")
    if arena.status != "pending":
        raise HTTPException(400, f"현재 상태({arena.status})에서는 수락할 수 없습니다.")

    now = _utcnow()
    arena.status = "active"
    arena.started_at = now
    arena.ends_at = now + timedelta(minutes=arena.duration_minutes)
    db.commit()
    db.refresh(arena)
    return arena


def decline_arena(db: Session, arena_id: int, user_id: int) -> Arena:
    arena = _get_or_404(db, arena_id)
    if arena.opponent_id != user_id:
        raise HTTPException(403, "아레나 초대를 받은 유저만 거절할 수 있습니다.")
    if arena.status != "pending":
        raise HTTPException(400, f"현재 상태({arena.status})에서는 거절할 수 없습니다.")

    arena.status = "declined"
    db.commit()
    db.refresh(arena)
    return arena


# ── 메시지 ────────────────────────────────────────────────────────────────────

def send_message(db: Session, arena_id: int, user_id: int, content: str) -> ArenaMessage:
    arena = _get_or_404(db, arena_id)
    if arena.status != "active":
        raise HTTPException(400, "진행 중인 아레나에서만 메시지를 보낼 수 있습니다.")
    if user_id not in (arena.creator_id, arena.opponent_id):
        raise HTTPException(403, "아레나 참가자만 메시지를 보낼 수 있습니다.")

    # 시간 초과 체크
    now = _utcnow()
    if arena.ends_at:
        ends_at = arena.ends_at
        if ends_at.tzinfo is None:
            ends_at = ends_at.replace(tzinfo=timezone.utc)
        if now > ends_at:
            arena.status = "finished"
            db.commit()
            raise HTTPException(400, "아레나 시간이 종료되었습니다.")

    msg = ArenaMessage(arena_id=arena_id, user_id=user_id, content=content.strip())
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


# ── 투표 ──────────────────────────────────────────────────────────────────────

def cast_vote(db: Session, arena_id: int, voter_id: int, voted_for_id: int) -> ArenaVote:
    arena = _get_or_404(db, arena_id)
    if arena.status not in ("active", "finished"):
        raise HTTPException(400, "진행 중이거나 종료된 아레나에서만 투표할 수 있습니다.")
    if voter_id in (arena.creator_id, arena.opponent_id):
        raise HTTPException(403, "아레나 참가자는 투표할 수 없습니다.")
    if voted_for_id not in (arena.creator_id, arena.opponent_id):
        raise HTTPException(400, "아레나 참가자에게만 투표할 수 있습니다.")

    existing = (
        db.query(ArenaVote)
        .filter(ArenaVote.arena_id == arena_id, ArenaVote.voter_id == voter_id)
        .first()
    )
    if existing:
        existing.voted_for_id = voted_for_id
        db.commit()
        db.refresh(existing)
        return existing

    vote = ArenaVote(arena_id=arena_id, voter_id=voter_id, voted_for_id=voted_for_id)
    db.add(vote)
    db.commit()
    db.refresh(vote)
    return vote


def get_vote_counts(db: Session, arena_id: int, viewer_id: Optional[int] = None) -> dict:
    arena = _get_or_404(db, arena_id)

    creator_votes = (
        db.query(func.count(ArenaVote.id))
        .filter(ArenaVote.arena_id == arena_id, ArenaVote.voted_for_id == arena.creator_id)
        .scalar()
    ) or 0
    opponent_votes = (
        db.query(func.count(ArenaVote.id))
        .filter(ArenaVote.arena_id == arena_id, ArenaVote.voted_for_id == arena.opponent_id)
        .scalar()
    ) or 0

    my_vote = None
    if viewer_id:
        v = (
            db.query(ArenaVote)
            .filter(ArenaVote.arena_id == arena_id, ArenaVote.voter_id == viewer_id)
            .first()
        )
        if v:
            my_vote = v.voted_for_id

    return {
        "creator_votes": creator_votes,
        "opponent_votes": opponent_votes,
        "my_vote": my_vote,
    }


# ── 목록 / 단건 조회 ──────────────────────────────────────────────────────────

def get_arenas(
    db: Session,
    page: int = 1,
    size: int = 20,
    status: Optional[str] = None,
):
    q = db.query(Arena)
    if status:
        q = q.filter(Arena.status == status)
    else:
        q = q.filter(Arena.status.in_(["pending", "active", "finished"]))

    total = q.count()
    arenas = q.order_by(Arena.created_at.desc()).offset((page - 1) * size).limit(size).all()

    # 만료된 active 아레나 자동 종료
    for arena in arenas:
        _auto_finish(db, arena)

    return {
        "items": arenas,
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if total else 1,
    }


def get_arena(db: Session, arena_id: int) -> Arena:
    arena = _get_or_404(db, arena_id)
    return _auto_finish(db, arena)


# ── 내부 헬퍼 ─────────────────────────────────────────────────────────────────

def _get_or_404(db: Session, arena_id: int) -> Arena:
    arena = db.query(Arena).filter(Arena.id == arena_id).first()
    if not arena:
        raise HTTPException(404, "아레나를 찾을 수 없습니다.")
    return arena


def _auto_finish(db: Session, arena: Arena) -> Arena:
    """ends_at 이 지난 active 아레나를 자동으로 finished 처리"""
    if arena.status == "active" and arena.ends_at:
        ends_at = arena.ends_at
        if ends_at.tzinfo is None:
            ends_at = ends_at.replace(tzinfo=timezone.utc)
        if _utcnow() > ends_at:
            arena.status = "finished"
            db.commit()
            db.refresh(arena)
    return arena

from typing import Optional, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user, get_optional_user
from app.models.arena import Arena
from app.models.user import User
from app.schemas.arena import ArenaCreate, ArenaSendMessage, ArenaVoteCreate
from app.services import arena_service

router = APIRouter(prefix="/arenas", tags=["Arena"])


# ── WebSocket 연결 관리자 ──────────────────────────────────────────────────────

class ArenaConnectionManager:
    def __init__(self):
        self.connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, arena_id: int, ws: WebSocket):
        await ws.accept()
        self.connections.setdefault(arena_id, []).append(ws)

    def disconnect(self, arena_id: int, ws: WebSocket):
        bucket = self.connections.get(arena_id, [])
        if ws in bucket:
            bucket.remove(ws)
        if not bucket and arena_id in self.connections:
            del self.connections[arena_id]

    async def broadcast(self, arena_id: int, message: dict):
        bucket = list(self.connections.get(arena_id, []))
        dead = []
        for ws in bucket:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(arena_id, ws)

    def spectator_count(self, arena_id: int) -> int:
        return len(self.connections.get(arena_id, []))


manager = ArenaConnectionManager()


# ── 직렬화 헬퍼 ───────────────────────────────────────────────────────────────

def _user_dict(user: User) -> dict:
    return {"id": user.id, "nickname": user.nickname, "avatar_url": user.avatar_url}


def _arena_dict(arena: Arena, db: Session, viewer_id: Optional[int] = None) -> dict:
    votes = arena_service.get_vote_counts(db, arena.id, viewer_id)
    return {
        "id": arena.id,
        "creator": _user_dict(arena.creator),
        "opponent": _user_dict(arena.opponent),
        "duration_minutes": arena.duration_minutes,
        "status": arena.status,
        "started_at": arena.started_at.isoformat() if arena.started_at else None,
        "ends_at": arena.ends_at.isoformat() if arena.ends_at else None,
        "created_at": arena.created_at.isoformat(),
        "creator_votes": votes["creator_votes"],
        "opponent_votes": votes["opponent_votes"],
        "my_vote": votes["my_vote"],
        "spectator_count": manager.spectator_count(arena.id),
    }


def _msg_dict(msg, user: User) -> dict:
    return {
        "id": msg.id,
        "arena_id": msg.arena_id,
        "user_id": msg.user_id,
        "user": _user_dict(user),
        "content": msg.content,
        "created_at": msg.created_at.isoformat(),
    }


# ── REST 엔드포인트 ───────────────────────────────────────────────────────────

@router.post("", status_code=201)
def create_arena(
    body: ArenaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    arena = arena_service.create_arena(db, current_user.id, body.opponent_id, body.duration_minutes)
    return _arena_dict(arena, db, current_user.id)


@router.get("")
def list_arenas(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=50),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    result = arena_service.get_arenas(db, page, size, status)
    viewer_id = current_user.id if current_user else None
    items = []
    for arena in result["items"]:
        d = _arena_dict(arena, db, viewer_id)
        d["message_count"] = len(arena.messages)
        items.append(d)
    return {**result, "items": items}


@router.get("/{arena_id}")
def get_arena(
    arena_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    arena = arena_service.get_arena(db, arena_id)
    viewer_id = current_user.id if current_user else None
    return _arena_dict(arena, db, viewer_id)


@router.post("/{arena_id}/accept")
async def accept_arena(
    arena_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    arena = arena_service.accept_arena(db, arena_id, current_user.id)
    data = _arena_dict(arena, db, current_user.id)
    await manager.broadcast(arena_id, {"type": "arena_started", "data": data})
    return data


@router.post("/{arena_id}/decline")
def decline_arena(
    arena_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    arena = arena_service.decline_arena(db, arena_id, current_user.id)
    return _arena_dict(arena, db, current_user.id)


@router.get("/{arena_id}/messages")
def get_messages(
    arena_id: int,
    db: Session = Depends(get_db),
):
    arena = arena_service.get_arena(db, arena_id)
    return [_msg_dict(m, m.user) for m in arena.messages]


@router.post("/{arena_id}/messages", status_code=201)
async def send_message(
    arena_id: int,
    body: ArenaSendMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = arena_service.send_message(db, arena_id, current_user.id, body.content)
    msg_data = _msg_dict(msg, current_user)
    await manager.broadcast(arena_id, {"type": "message", "data": msg_data})

    # 시간 만료 후 자동 종료 broadcast
    arena = arena_service.get_arena(db, arena_id)
    if arena.status == "finished":
        await manager.broadcast(arena_id, {
            "type": "arena_ended",
            "data": _arena_dict(arena, db),
        })

    return msg_data


@router.post("/{arena_id}/vote", status_code=201)
async def cast_vote(
    arena_id: int,
    body: ArenaVoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    arena_service.cast_vote(db, arena_id, current_user.id, body.voted_for_id)
    votes = arena_service.get_vote_counts(db, arena_id, current_user.id)
    await manager.broadcast(arena_id, {"type": "vote_update", "data": votes})
    return votes


@router.delete("/{arena_id}", status_code=204)
def delete_arena(
    arena_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자만 아레나를 삭제할 수 있습니다.")
    arena_service.delete_arena(db, arena_id)


@router.get("/{arena_id}/votes")
def get_votes(
    arena_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    viewer_id = current_user.id if current_user else None
    return arena_service.get_vote_counts(db, arena_id, viewer_id)


# ── WebSocket ─────────────────────────────────────────────────────────────────

@router.websocket("/{arena_id}/ws")
async def arena_ws(arena_id: int, ws: WebSocket, db: Session = Depends(get_db)):
    await manager.connect(arena_id, ws)
    try:
        await manager.broadcast(arena_id, {
            "type": "spectator_count",
            "data": {"count": manager.spectator_count(arena_id)},
        })
        while True:
            # keep-alive — 클라이언트 ping 수신 대기
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(arena_id, ws)
        await manager.broadcast(arena_id, {
            "type": "spectator_count",
            "data": {"count": manager.spectator_count(arena_id)},
        })


# ── 유저 검색 (아레나 생성 시 상대방 선택용) ──────────────────────────────────

@router.get("/users/search")
def search_users(
    q: str = Query("", min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.user import User as UserModel
    users = (
        db.query(UserModel)
        .filter(
            UserModel.is_active == True,
            UserModel.id != current_user.id,
            UserModel.nickname.ilike(f"%{q}%"),
        )
        .limit(10)
        .all()
    )
    return [{"id": u.id, "nickname": u.nickname, "avatar_url": u.avatar_url} for u in users]

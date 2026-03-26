import asyncio
import json
import logging
import random
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.database import get_db, SessionLocal
from app.dependencies import get_current_user, get_optional_user
from app.models.apple_arena import AppleArenaRoom, AppleArenaPlayer
from app.models.user import User

router = APIRouter(prefix="/apple-arena", tags=["AppleArena"])

GAME_DURATION = 120   # 초
MAX_PLAYERS = 4
BOARD_ROWS = 10
BOARD_COLS = 17


# ── 게임 보드 생성 ─────────────────────────────────────────────────────────────

def _generate_board() -> List[List[int]]:
    """17×10 사과 게임 보드 생성 (합이 10이 되는 쌍을 기반으로 생성)"""
    cells = []
    pairs = [(1, 9), (2, 8), (3, 7), (4, 6), (5, 5)]
    total = BOARD_ROWS * BOARD_COLS  # 170

    # 쌍으로 채우기 (짝수 170이므로 정확히 85쌍)
    for _ in range(total // 2):
        a, b = random.choice(pairs)
        cells.append(a)
        cells.append(b)

    random.shuffle(cells)
    board = [cells[r * BOARD_COLS:(r + 1) * BOARD_COLS] for r in range(BOARD_ROWS)]
    return board


# ── WebSocket 연결 관리자 ──────────────────────────────────────────────────────

class RoomConnectionManager:
    def __init__(self):
        # room_id → list of (websocket, user_id)
        self.connections: Dict[int, List[Tuple[WebSocket, int]]] = {}

    def register(self, room_id: int, ws: WebSocket, user_id: int):
        """이미 accept된 WebSocket을 연결 목록에 등록 (accept 호출 없음)."""
        self.connections.setdefault(room_id, []).append((ws, user_id))

    def disconnect(self, room_id: int, ws: WebSocket):
        bucket = self.connections.get(room_id, [])
        self.connections[room_id] = [(w, uid) for w, uid in bucket if w is not ws]

    async def broadcast(self, room_id: int, message: dict, exclude_user: Optional[int] = None):
        dead = []
        for ws, uid in list(self.connections.get(room_id, [])):
            if exclude_user is not None and uid == exclude_user:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(room_id, ws)

    async def send_to(self, room_id: int, user_id: int, message: dict):
        for ws, uid in list(self.connections.get(room_id, [])):
            if uid == user_id:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass

    def connected_users(self, room_id: int) -> List[int]:
        return [uid for _, uid in self.connections.get(room_id, [])]


manager = RoomConnectionManager()
_game_timers: Dict[int, asyncio.Task] = {}


# ── 게임 타이머 ───────────────────────────────────────────────────────────────

async def _game_timer(room_id: int):
    await asyncio.sleep(GAME_DURATION)
    db = SessionLocal()
    try:
        room = db.query(AppleArenaRoom).filter(AppleArenaRoom.id == room_id).first()
        if not room or room.status != "playing":
            return
        room.status = "finished"
        room.ended_at = datetime.now(timezone.utc)
        db.commit()
        results = _build_results(room)
        await manager.broadcast(room_id, {"type": "game_ended", "data": {"results": results}})
    finally:
        db.close()
    _game_timers.pop(room_id, None)


# ── 직렬화 헬퍼 ───────────────────────────────────────────────────────────────

def _player_dict(p: AppleArenaPlayer) -> dict:
    return {
        "user_id": p.user_id,
        "nickname": p.user.nickname,
        "avatar_url": getattr(p.user, "avatar_url", None),
        "is_ready": p.is_ready,
        "score": p.score,
    }


def _room_dict(room: AppleArenaRoom, include_boards: bool = False) -> dict:
    data = {
        "id": room.id,
        "creator_id": room.creator_id,
        "creator_nickname": room.creator.nickname,
        "status": room.status,
        "created_at": room.created_at.isoformat(),
        "started_at": room.started_at.isoformat() if room.started_at else None,
        "ended_at": room.ended_at.isoformat() if room.ended_at else None,
        "players": [_player_dict(p) for p in room.players],
    }
    if include_boards:
        data["boards"] = {
            str(p.user_id): json.loads(p.board) for p in room.players if p.board
        }
    return data


def _build_results(room: AppleArenaRoom) -> list:
    players = sorted(room.players, key=lambda p: -p.score)
    results = []
    for i, p in enumerate(players):
        r = _player_dict(p)
        r["rank"] = i + 1
        results.append(r)
    return results


def _get_user_from_token(token: str, db: Session) -> Optional[User]:
    payload = decode_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if user_id is None:
        return None
    return db.query(User).filter(User.id == int(user_id), User.is_active == True).first()


# ── REST 엔드포인트 ────────────────────────────────────────────────────────────

@router.get("/rooms")
def list_rooms(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    q = db.query(AppleArenaRoom)
    if status:
        q = q.filter(AppleArenaRoom.status == status)
    else:
        q = q.filter(AppleArenaRoom.status.in_(["waiting", "playing"]))
    rooms = q.order_by(AppleArenaRoom.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": r.id,
            "creator_id": r.creator_id,
            "creator_nickname": r.creator.nickname,
            "status": r.status,
            "player_count": len(r.players),
            "created_at": r.created_at.isoformat(),
        }
        for r in rooms
    ]


@router.post("/rooms", status_code=201)
def create_room(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 이미 진행 중인 방 참가 여부 확인
    existing = (
        db.query(AppleArenaPlayer)
        .join(AppleArenaRoom)
        .filter(
            AppleArenaPlayer.user_id == current_user.id,
            AppleArenaRoom.status.in_(["waiting", "playing"]),
        )
        .first()
    )
    if existing:
        raise HTTPException(400, "이미 진행 중인 방이 있습니다.")

    room = AppleArenaRoom(creator_id=current_user.id)
    db.add(room)
    db.flush()
    player = AppleArenaPlayer(room_id=room.id, user_id=current_user.id)
    db.add(player)
    db.commit()
    db.refresh(room)
    return {"id": room.id}


@router.get("/rooms/{room_id}")
def get_room(room_id: int, db: Session = Depends(get_db)):
    room = db.query(AppleArenaRoom).filter(AppleArenaRoom.id == room_id).first()
    if not room:
        raise HTTPException(404, "방을 찾을 수 없습니다.")
    data = _room_dict(room)
    if room.status == "finished":
        # 결과 화면용 리플레이 데이터 포함
        for i, p in enumerate(room.players):
            if p.board:
                data["players"][i]["initial_board"] = json.loads(p.board)
            if p.snapshots:
                data["players"][i]["snapshots"] = json.loads(p.snapshots)
        data["results"] = _build_results(room)
    return data


@router.delete("/rooms/{room_id}", status_code=204)
def delete_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    room = db.query(AppleArenaRoom).filter(AppleArenaRoom.id == room_id).first()
    if not room:
        raise HTTPException(404, "방을 찾을 수 없습니다.")
    if room.creator_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, "삭제 권한이 없습니다.")
    db.delete(room)
    db.commit()


# ── WebSocket 엔드포인트 ───────────────────────────────────────────────────────

@router.websocket("/rooms/{room_id}/ws")
async def room_ws(
    room_id: int,
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    # ── WebSocket을 먼저 accept한 뒤 검증 (close-before-accept 버그 방지) ──────
    await websocket.accept()

    # 인증
    user = _get_user_from_token(token, db)
    if not user:
        # Vite 프록시가 커스텀 close code를 항상 중계하지 못하므로
        # 메시지로도 에러를 전달한 뒤 close
        await websocket.send_json({"type": "error", "data": {"code": 4001, "message": "인증에 실패했습니다."}})
        await websocket.close(code=4001)
        return

    # 방 조회
    room = db.query(AppleArenaRoom).filter(AppleArenaRoom.id == room_id).first()
    if not room:
        await websocket.send_json({"type": "error", "data": {"code": 4004, "message": "방을 찾을 수 없습니다."}})
        await websocket.close(code=4004)
        return

    # 방에 이미 참가했는지 확인
    player = (
        db.query(AppleArenaPlayer)
        .filter(AppleArenaPlayer.room_id == room_id, AppleArenaPlayer.user_id == user.id)
        .first()
    )

    if not player:
        # 새로 입장 시도
        if room.status != "waiting":
            await websocket.send_json({"type": "error", "data": {"code": 4003, "message": "입장할 수 없는 방입니다."}})
            await websocket.close(code=4003)
            return
        if len(room.players) >= MAX_PLAYERS:
            await websocket.send_json({"type": "error", "data": {"code": 4003, "message": "방이 가득 찼습니다."}})
            await websocket.close(code=4003)
            return
        player = AppleArenaPlayer(room_id=room_id, user_id=user.id)
        db.add(player)
        db.commit()
        db.refresh(player)
        db.refresh(room)

        manager.register(room_id, websocket, user.id)
        # 기존 플레이어에게 입장 알림
        await manager.broadcast(room_id, {
            "type": "player_joined",
            "data": _player_dict(player),
        }, exclude_user=user.id)
        # 입장한 플레이어에게 현재 방 상태 전송
        await websocket.send_json({"type": "room_state", "data": _room_dict(room)})
    else:
        manager.register(room_id, websocket, user.id)
        room_data = _room_dict(room)
        # 게임 진행 중이면 보드 정보도 포함
        if room.status == "playing":
            room_data["boards"] = {
                str(p.user_id): json.loads(p.board) for p in room.players if p.board
            }
        # 종료된 방이면 리플레이 데이터 포함 (재접속 시 결과/리플레이 복원)
        elif room.status == "finished":
            for i, p in enumerate(room.players):
                if p.board:
                    room_data["players"][i]["initial_board"] = json.loads(p.board)
                if p.snapshots:
                    room_data["players"][i]["snapshots"] = json.loads(p.snapshots)
            room_data["results"] = _build_results(room)
        await websocket.send_json({"type": "room_state", "data": room_data})

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            db.expire_all()
            room = db.query(AppleArenaRoom).filter(AppleArenaRoom.id == room_id).first()
            player = (
                db.query(AppleArenaPlayer)
                .filter(AppleArenaPlayer.room_id == room_id, AppleArenaPlayer.user_id == user.id)
                .first()
            )
            if not room or not player:
                break

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif msg_type == "ready":
                if room.status != "waiting":
                    continue
                player.is_ready = not player.is_ready
                db.commit()
                await manager.broadcast(room_id, {
                    "type": "player_ready",
                    "data": {"user_id": user.id, "is_ready": player.is_ready},
                })

            elif msg_type == "start_game":
                if room.creator_id != user.id or room.status != "waiting":
                    continue
                # 방장 외 모든 플레이어가 준비 완료인지 확인
                non_creator = [p for p in room.players if p.user_id != user.id]
                if non_creator and not all(p.is_ready for p in non_creator):
                    await websocket.send_json({
                        "type": "error",
                        "data": {"message": "모든 플레이어가 준비 완료해야 시작할 수 있습니다."},
                    })
                    continue

                # 모든 플레이어에게 동일한 보드 생성
                shared_board = _generate_board()
                boards = {}
                for p in room.players:
                    p.board = json.dumps(shared_board)
                    boards[str(p.user_id)] = shared_board

                room.status = "playing"
                room.started_at = datetime.now(timezone.utc)
                db.commit()

                await manager.broadcast(room_id, {
                    "type": "game_started",
                    "data": {"boards": boards, "duration": GAME_DURATION},
                })

                # 타이머 시작
                if room_id in _game_timers:
                    _game_timers[room_id].cancel()
                _game_timers[room_id] = asyncio.create_task(_game_timer(room_id))

            elif msg_type == "board_change":
                if room.status != "playing":
                    continue
                payload = data.get("data", {})
                new_score = int(payload.get("score", player.score))
                cleared = payload.get("cleared", [])
                player.score = new_score
                db.commit()
                await manager.broadcast(room_id, {
                    "type": "board_change",
                    "data": {"user_id": user.id, "score": new_score, "cleared": cleared},
                })

            elif msg_type == "submit_snapshots":
                snapshots = data.get("data", {}).get("snapshots", [])
                player.snapshots = json.dumps(snapshots)
                db.commit()

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.exception("apple_arena room_ws 예외 발생 (room=%s, user=%s): %s", room_id, user.id, exc)
    finally:
        manager.disconnect(room_id, websocket)
        # 같은 유저의 다른 활성 연결이 없을 때만 player_left 브로드캐스트
        # (React StrictMode 이중 마운트 시 첫 번째 연결 종료로 인한 오작동 방지)
        if user.id not in manager.connected_users(room_id):
            await manager.broadcast(room_id, {
                "type": "player_left",
                "data": {"user_id": user.id},
            })

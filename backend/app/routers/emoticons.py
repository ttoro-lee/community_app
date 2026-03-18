import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.emoticon import EmoticonResponse
from app.services import emoticon_service

router = APIRouter(prefix="/emoticons", tags=["Emoticons"])

# storage/uploads/emoticons/
EMOTICON_DIR = Path(__file__).parent.parent.parent / "storage" / "uploads" / "emoticons"
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_SIZE = 5 * 1024 * 1024  # 5 MB


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    return current_user


# ─── 공개 API ─────────────────────────────────────────────────────────────────

@router.get("", response_model=List[EmoticonResponse])
def get_emoticons(db: Session = Depends(get_db)):
    """활성화된 이모티콘 목록 조회 (모든 유저)"""
    return emoticon_service.list_emoticons(db)


# ─── 관리자 API ───────────────────────────────────────────────────────────────

@router.get("/all", response_model=List[EmoticonResponse])
def get_all_emoticons(
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    """모든 이모티콘 목록 조회 (관리자용 — 비활성 포함)"""
    return emoticon_service.list_all_emoticons(db)


@router.post("", response_model=EmoticonResponse)
async def create_emoticon(
    name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    """이모티콘 등록 (관리자) — 이미지는 200×200 으로 편집 후 업로드"""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="지원하지 않는 파일 형식입니다. (jpg, png, gif, webp 만 허용)",
        )

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="파일 크기는 5 MB를 초과할 수 없습니다.")

    EMOTICON_DIR.mkdir(parents=True, exist_ok=True)

    ext = (file.filename or "image").rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "gif", "webp"):
        ext = "png"

    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = EMOTICON_DIR / filename
    filepath.write_bytes(content)

    image_url = f"/api/uploads/emoticons/{filename}"
    return emoticon_service.create_emoticon(db, name=name, image_url=image_url)


@router.delete("/{emoticon_id}", status_code=204)
def delete_emoticon(
    emoticon_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    """이모티콘 삭제 (관리자)"""
    emoticon_service.delete_emoticon(db, emoticon_id)


@router.patch("/{emoticon_id}/toggle", response_model=EmoticonResponse)
def toggle_emoticon(
    emoticon_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    """이모티콘 활성화/비활성화 토글 (관리자)"""
    return emoticon_service.toggle_emoticon(db, emoticon_id)

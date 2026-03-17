import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/upload", tags=["Upload"])

# backend/app/routers/ → backend/app/ → backend/ → storage/uploads/
UPLOAD_DIR = Path(__file__).parent.parent.parent / "storage" / "uploads"

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """이미지 업로드 (jpg·png·gif·webp, 최대 10 MB)"""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="지원하지 않는 파일 형식입니다. (jpg, png, gif, webp 만 허용)",
        )

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="파일 크기는 10 MB를 초과할 수 없습니다.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    ext = (file.filename or "image").rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "gif", "webp"):
        ext = "png"

    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = UPLOAD_DIR / filename
    filepath.write_bytes(content)

    return {"url": f"/api/uploads/{filename}"}

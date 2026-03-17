from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import decode_token
from app.models.user import User

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 토큰입니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: int = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰에 사용자 정보가 없습니다.",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="비활성화된 계정입니다.",
        )

    # 활동 정지 여부 확인
    if user.suspended_until is not None:
        now = datetime.now(timezone.utc)
        # suspended_until이 timezone-aware인지 확인
        suspended_until = user.suspended_until
        if suspended_until.tzinfo is None:
            suspended_until = suspended_until.replace(tzinfo=timezone.utc)
        if suspended_until > now:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": "활동이 정지된 계정입니다.",
                    "suspended_until": suspended_until.isoformat(),
                    "reason": user.suspend_reason or "",
                },
            )

    return user


def get_super_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="슈퍼 관리자 권한이 필요합니다.",
        )
    return current_user


def get_optional_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
) -> User | None:
    if credentials is None:
        return None
    token = credentials.credentials
    payload = decode_token(token)
    if payload is None:
        return None
    user_id = payload.get("sub")
    if user_id is None:
        return None
    return db.query(User).filter(User.id == int(user_id)).first()

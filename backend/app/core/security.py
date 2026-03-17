from datetime import datetime, timedelta
from typing import Optional
import hashlib
import base64
import bcrypt
from jose import JWTError, jwt
from app.core.config import settings


def _prepare_password(password: str) -> bytes:
    """
    bcrypt는 72바이트를 초과하는 입력을 처리하지 못합니다.
    SHA-256 → base64 변환으로 항상 44바이트 이내로 정규화합니다.
    passlib을 사용하지 않고 bcrypt 라이브러리를 직접 호출하여
    bcrypt 4.x / 5.x 버전 호환성 문제를 회피합니다.
    """
    digest = hashlib.sha256(password.encode("utf-8")).digest()
    return base64.b64encode(digest)


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(_prepare_password(password), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        _prepare_password(plain_password),
        hashed_password.encode("utf-8"),
    )


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

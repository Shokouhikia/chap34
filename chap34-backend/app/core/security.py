"""
Real auth for the atelier + operations panels (unlike the customer-facing
OTP flow in app/api/auth.py, which is still intentionally fake). Passwords
are bcrypt-hashed and sessions are signed JWTs.

DEMO NOTE: the spec originally called for passlib's CryptContext, but the
pinned passlib 1.7.4 is unmaintained and raises on bcrypt >= 4.1 (the
version installed here). We call the bcrypt API directly instead - same
algorithm, one less dead dependency.
"""
import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

JWT_ALGORITHM = "HS256"
JWT_TTL_HOURS = 12

# bcrypt hashes at most the first 72 bytes of a password and raises on more,
# so we truncate defensively to keep long passwords from blowing up.
_BCRYPT_MAX_BYTES = 72

bearer_scheme = HTTPBearer(auto_error=False)


class Actor(str, Enum):
    """Which kind of panel account a JWT was issued for. Kept in the token
    payload so an atelier token can't be replayed as an operator token."""
    ATELIER = "atelier"
    OPERATOR = "operator"


def hash_password(raw_password: str) -> str:
    pw = raw_password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def verify_password(raw_password: str, password_hash: str) -> bool:
    pw = raw_password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    try:
        return bcrypt.checkpw(pw, password_hash.encode("utf-8"))
    except ValueError:
        # Malformed hash in the DB - treat as a failed login, never a 500.
        return False


def create_access_token(subject_id: uuid.UUID, actor: Actor) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject_id),
        "actor": actor.value,
        "iat": now,
        "exp": now + timedelta(hours=JWT_TTL_HOURS),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="نشست شما منقضی شده، دوباره وارد شوید")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="توکن نامعتبر است")


def require_actor(
    expected: Actor,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> uuid.UUID:
    """Shared guard: validates the bearer JWT and checks it was issued for
    the expected actor kind (atelier vs operator), returning the subject id."""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ورود لازم است")

    payload = decode_access_token(credentials.credentials)
    if payload.get("actor") != expected.value:
        raise HTTPException(status_code=403, detail="دسترسی مجاز نیست")

    try:
        return uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        raise HTTPException(status_code=401, detail="توکن نامعتبر است")

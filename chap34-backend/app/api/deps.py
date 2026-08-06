"""
Demo-grade auth helpers.

IMPORTANT: this is intentionally fake for the first demo:
- anonymous session = a random token the frontend stores and sends back,
  no cookies/JWT signing yet.
- "logged in" user = a bearer token that is literally the user's UUID.
Swap this out for real signed sessions/JWT before going anywhere near
production - nothing here is secure.
"""
import uuid

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import Actor, bearer_scheme, require_actor
from app.models.atelier import Atelier
from app.models.operator import Operator
from app.models.session import AnonymousSession
from app.models.user import User


def get_or_create_anonymous_session(
    x_session_token: str | None = Header(default=None),
    db: Session = Depends(get_session),
) -> AnonymousSession:
    if x_session_token:
        existing = db.exec(
            select(AnonymousSession).where(AnonymousSession.token == x_session_token)
        ).first()
        if existing:
            return existing

    new_session = AnonymousSession(token=uuid.uuid4().hex)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_session),
) -> User:
    """Demo-only: expects `Authorization: Bearer <user_id>`."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="ورود لازم است")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        user_id = uuid.UUID(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="توکن نامعتبر است")

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="کاربر یافت نشد")
    return user


def get_current_atelier(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_session),
) -> Atelier:
    """Resolve the atelier behind a valid `actor=atelier` JWT, or 401/403.
    This is real auth (JWT + bcrypt), unlike the fake customer flow above."""
    atelier_id = require_actor(Actor.ATELIER, credentials)
    atelier = db.get(Atelier, atelier_id)
    if not atelier or not atelier.is_active:
        raise HTTPException(status_code=401, detail="آتلیه یافت نشد یا غیرفعال است")
    return atelier


def get_current_operator(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_session),
) -> Operator:
    """Resolve the operator behind a valid `actor=operator` JWT, or 401/403."""
    operator_id = require_actor(Actor.OPERATOR, credentials)
    operator = db.get(Operator, operator_id)
    if not operator or not operator.is_active:
        raise HTTPException(status_code=401, detail="اپراتور یافت نشد یا غیرفعال است")
    return operator

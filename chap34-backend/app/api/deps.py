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
from sqlmodel import Session, select

from app.core.database import get_session
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

import uuid

from fastapi import Depends, Header, HTTPException
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import decode_token
from app.models.session import AnonymousSession
from app.models.user import User
from app.models.staff import StaffAccount, StaffRole


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
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="ورود لازم است")

    token = authorization.removeprefix("Bearer ").strip()
    payload = decode_token(token)
    if not payload or payload.get("type") != "customer":
        raise HTTPException(status_code=401, detail="توکن نامعتبر است")

    user = db.get(User, uuid.UUID(payload["sub"]))
    if not user:
        raise HTTPException(status_code=401, detail="کاربر یافت نشد")
    return user


def require_staff_role(role: StaffRole):
    def dependency(
        authorization: str | None = Header(default=None),
        db: Session = Depends(get_session),
    ) -> StaffAccount:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="ورود لازم است")

        token = authorization.removeprefix("Bearer ").strip()
        payload = decode_token(token)
        if not payload or payload.get("type") != "staff" or payload.get("role") != role.value:
            raise HTTPException(status_code=401, detail="دسترسی لازم را ندارید")

        staff = db.get(StaffAccount, uuid.UUID(payload["sub"]))
        if not staff or not staff.is_active:
            raise HTTPException(status_code=401, detail="حساب یافت نشد یا غیرفعال است")
        return staff

    return dependency

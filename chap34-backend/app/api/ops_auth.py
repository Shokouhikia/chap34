"""
Operations-panel authentication (BRD 5.1 #5) plus a thin admin surface for
managing atelier accounts. Admin endpoints require an operator whose role is
`admin`; everything else accepts any active operator (role enforcement is a
documented placeholder - see OperatorRole).
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.deps import get_current_operator
from app.core.database import get_session
from app.core.security import Actor, create_access_token, hash_password, verify_password
from app.models.atelier import Atelier
from app.models.operator import Operator, OperatorRole

router = APIRouter(prefix="/api/ops", tags=["ops-auth"])
admin_router = APIRouter(prefix="/api/admin", tags=["admin"])


class LoginBody(BaseModel):
    username: str
    password: str


class ChangePasswordBody(BaseModel):
    old_password: str
    new_password: str


@router.post("/login")
def login(body: LoginBody, db: Session = Depends(get_session)):
    operator = db.exec(
        select(Operator).where(Operator.username == body.username)
    ).first()
    if not operator or not verify_password(body.password, operator.password_hash):
        raise HTTPException(status_code=401, detail="نام کاربری یا رمز عبور نادرست است")
    if not operator.is_active:
        raise HTTPException(status_code=403, detail="حساب اپراتور غیرفعال است")

    operator.last_login_at = datetime.utcnow()
    db.add(operator)
    db.commit()

    token = create_access_token(operator.id, Actor.OPERATOR)
    return {
        "token": token,
        "name": operator.name,
        "username": operator.username,
        "role": operator.role.value,
    }


@router.post("/change-password")
def change_password(
    body: ChangePasswordBody,
    db: Session = Depends(get_session),
    operator: Operator = Depends(get_current_operator),
):
    if not verify_password(body.old_password, operator.password_hash):
        raise HTTPException(status_code=400, detail="رمز عبور فعلی نادرست است")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="رمز جدید باید حداقل ۶ کاراکتر باشد")
    operator.password_hash = hash_password(body.new_password)
    db.add(operator)
    db.commit()
    return {"ok": True}


@router.get("/me")
def me(operator: Operator = Depends(get_current_operator)):
    return {"name": operator.name, "username": operator.username, "role": operator.role.value}


# --------------------------------------------------------------------------
# Admin: atelier accounts (BRD 5.1 #1 - ateliers can't self-register)
# --------------------------------------------------------------------------
def require_admin(operator: Operator = Depends(get_current_operator)) -> Operator:
    if operator.role != OperatorRole.ADMIN:
        raise HTTPException(status_code=403, detail="دسترسی مدیر لازم است")
    return operator


class AtelierCreate(BaseModel):
    name: str
    username: str
    password: str


@admin_router.get("/ateliers")
def list_ateliers(
    db: Session = Depends(get_session),
    _: Operator = Depends(require_admin),
):
    ateliers = db.exec(select(Atelier)).all()
    return [
        {"id": str(a.id), "name": a.name, "username": a.username, "is_active": a.is_active}
        for a in ateliers
    ]


@admin_router.post("/ateliers")
def create_atelier(
    body: AtelierCreate,
    db: Session = Depends(get_session),
    _: Operator = Depends(require_admin),
):
    exists = db.exec(select(Atelier).where(Atelier.username == body.username)).first()
    if exists:
        raise HTTPException(status_code=400, detail="این نام کاربری قبلاً ثبت شده است")
    atelier = Atelier(
        name=body.name,
        username=body.username,
        password_hash=hash_password(body.password),
    )
    db.add(atelier)
    db.commit()
    db.refresh(atelier)
    return {"id": str(atelier.id), "name": atelier.name, "username": atelier.username}


@admin_router.delete("/ateliers/{atelier_id}")
def deactivate_atelier(
    atelier_id: str,
    db: Session = Depends(get_session),
    _: Operator = Depends(require_admin),
):
    atelier = db.get(Atelier, atelier_id)
    if not atelier:
        raise HTTPException(status_code=404, detail="آتلیه یافت نشد")
    # Soft-delete: keep history intact, just disable login.
    atelier.is_active = False
    db.add(atelier)
    db.commit()
    return {"ok": True}

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.deps import require_staff_role
from app.core.database import get_session
from app.core.security import create_staff_token, hash_password, verify_password
from app.models.staff import StaffAccount, StaffRole

router = APIRouter(prefix="/api/staff", tags=["staff"])


class LoginBody(BaseModel):
    username: str
    password: str


class ChangePasswordBody(BaseModel):
    old_password: str
    new_password: str


@router.post("/login")
def login(body: LoginBody, db: Session = Depends(get_session)):
    staff = db.exec(
        select(StaffAccount).where(StaffAccount.username == body.username)
    ).first()
    if not staff or not verify_password(body.password, staff.password_hash):
        raise HTTPException(status_code=401, detail="نام کاربری یا رمز عبور نادرست است")
    if not staff.is_active:
        raise HTTPException(status_code=403, detail="حساب غیرفعال است")

    from datetime import datetime
    staff.last_login_at = datetime.utcnow()
    db.add(staff)
    db.commit()

    token = create_staff_token(staff.id, staff.role.value)
    return {
        "token": token,
        "name": staff.name,
        "username": staff.username,
        "role": staff.role.value,
    }


@router.post("/change-password")
def change_password(
    body: ChangePasswordBody,
    db: Session = Depends(get_session),
    staff: StaffAccount = Depends(require_staff_role(StaffRole.ATELIER)),
):
    if not verify_password(body.old_password, staff.password_hash):
        raise HTTPException(status_code=400, detail="رمز عبور فعلی نادرست است")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="رمز جدید باید حداقل ۶ کاراکتر باشد")
    staff.password_hash = hash_password(body.new_password)
    db.add(staff)
    db.commit()
    return {"ok": True}


@router.get("/me")
def me(staff: StaffAccount = Depends(require_staff_role(StaffRole.ATELIER))):
    return {"name": staff.name, "username": staff.username, "role": staff.role.value}

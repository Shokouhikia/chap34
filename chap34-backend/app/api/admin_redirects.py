import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.deps import require_staff_role
from app.core.database import get_session
from app.models.redirect import Redirect
from app.models.staff import StaffAccount, StaffRole
from app.services import redirects_service

router = APIRouter(prefix="/api/admin/redirects", tags=["admin"])
require_admin = require_staff_role(StaffRole.ADMIN)


class RedirectIn(BaseModel):
    source_path: str
    destination_path: str
    status_code: int = 301
    is_active: bool = True


@router.get("")
def list_redirects(db: Session = Depends(get_session), _staff: StaffAccount = Depends(require_admin)):
    rows = db.exec(select(Redirect).order_by(Redirect.created_at.desc())).all()
    return {"redirects": rows}


@router.post("")
def create_redirect(body: RedirectIn, db: Session = Depends(get_session), _staff: StaffAccount = Depends(require_admin)):
    if body.status_code not in (301, 302, 307, 308):
        raise HTTPException(status_code=400, detail="کد وضعیت نامعتبر است")

    source, destination = redirects_service.validate_and_normalize(body.source_path, body.destination_path)
    redirects_service.check_duplicate(db, source)
    redirects_service.check_loop_and_chain(db, source, destination)

    row = Redirect(
        source_path=source,
        destination_path=destination,
        status_code=body.status_code,
        is_active=body.is_active,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/{redirect_id}")
def update_redirect(
    redirect_id: uuid.UUID,
    body: RedirectIn,
    db: Session = Depends(get_session),
    _staff: StaffAccount = Depends(require_admin),
):
    row = db.get(Redirect, redirect_id)
    if not row:
        raise HTTPException(status_code=404, detail="یافت نشد")
    if body.status_code not in (301, 302, 307, 308):
        raise HTTPException(status_code=400, detail="کد وضعیت نامعتبر است")

    source, destination = redirects_service.validate_and_normalize(body.source_path, body.destination_path)
    redirects_service.check_duplicate(db, source, exclude_id=redirect_id)
    redirects_service.check_loop_and_chain(db, source, destination, exclude_id=redirect_id)

    row.source_path = source
    row.destination_path = destination
    row.status_code = body.status_code
    row.is_active = body.is_active
    redirects_service.touch(row)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{redirect_id}")
def delete_redirect(redirect_id: uuid.UUID, db: Session = Depends(get_session), _staff: StaffAccount = Depends(require_admin)):
    row = db.get(Redirect, redirect_id)
    if not row:
        raise HTTPException(status_code=404, detail="یافت نشد")
    db.delete(row)
    db.commit()
    return {"ok": True}

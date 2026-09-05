import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.deps import require_staff_role
from app.core.database import get_session
from app.models.contact_message import ContactMessage
from app.models.staff import StaffAccount, StaffRole

router = APIRouter(prefix="/api/admin/contact-messages", tags=["admin"])
require_admin = require_staff_role(StaffRole.ADMIN)


@router.get("")
def list_messages(db: Session = Depends(get_session), _staff: StaffAccount = Depends(require_admin)):
    rows = db.exec(select(ContactMessage).order_by(ContactMessage.created_at.desc())).all()
    return {"messages": rows}


@router.patch("/{message_id}/read")
def mark_read(message_id: uuid.UUID, db: Session = Depends(get_session), _staff: StaffAccount = Depends(require_admin)):
    row = db.get(ContactMessage, message_id)
    if not row:
        raise HTTPException(status_code=404, detail="یافت نشد")
    row.is_read = True
    db.add(row)
    db.commit()
    return {"ok": True}

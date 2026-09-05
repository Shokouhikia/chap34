from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.deps import require_staff_role
from app.core.database import get_session
from app.models.staff import StaffAccount, StaffRole
from app.services import smsir_service

router = APIRouter(prefix="/api/admin/smsir", tags=["admin"])
require_admin = require_staff_role(StaffRole.ADMIN)


@router.get("/credit")
def get_credit(db: Session = Depends(get_session), _staff: StaffAccount = Depends(require_admin)):
    if not smsir_service.is_enabled(db):
        return {"enabled": False, "credit": None}
    return {"enabled": True, "credit": smsir_service.get_credit(db)}

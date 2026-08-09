"""
Operations dashboard (BRD 5.3): a count of orders sitting at each stage of
the lifecycle, used to render the clickable status cards.
"""
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.api.deps import require_staff_role
from app.core.database import get_session
from app.models.staff import StaffRole
from app.models.order import FulfillmentStatus, Order
from app.services.status_mapping import count_by_status

router = APIRouter(prefix="/api/ops", tags=["ops-dashboard"])

DASHBOARD_CARDS: list[tuple[str, str]] = [
    (FulfillmentStatus.REGISTERED.value, "سفارش‌های جدید"),
    (FulfillmentStatus.QUEUED.value, "در صف چاپ"),
    (FulfillmentStatus.PRINTING.value, "در حال چاپ"),
    (FulfillmentStatus.PRINTED.value, "چاپ‌شده"),
    (FulfillmentStatus.READY_TO_PACK.value, "آماده بسته‌بندی"),
    (FulfillmentStatus.PACKING.value, "در حال بسته‌بندی"),
    (FulfillmentStatus.PACKED.value, "بسته‌بندی‌شده"),
    (FulfillmentStatus.READY_TO_SHIP.value, "آماده ارسال"),
    (FulfillmentStatus.HANDED_TO_POST.value, "تحویل به پست"),
    (FulfillmentStatus.SHIPPED.value, "ارسال‌شده"),
    (FulfillmentStatus.DELIVERED.value, "تحویل مشتری"),
]


@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_session),
    _=Depends(require_staff_role(StaffRole.ATELIER)),
):
    statuses = [o.fulfillment_status for o in db.exec(select(Order)).all()]
    counts = count_by_status(statuses)
    return {
        "cards": [
            {"status": status, "label": label, "count": counts[status]}
            for status, label in DASHBOARD_CARDS
        ],
        "total": len(statuses),
    }

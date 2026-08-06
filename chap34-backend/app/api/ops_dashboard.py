"""
Operations dashboard (BRD 5.3): a count of orders sitting at each stage of
the lifecycle, used to render the clickable status cards.
"""
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.api.deps import get_current_operator
from app.core.database import get_session
from app.models.operator import Operator
from app.models.order import FulfillmentStatus, Order
from app.services.status_mapping import count_by_status

router = APIRouter(prefix="/api/ops", tags=["ops-dashboard"])

# The stages surfaced as dashboard cards, with Persian labels and display order.
DASHBOARD_CARDS: list[tuple[str, str]] = [
    (FulfillmentStatus.REGISTERED.value, "سفارش‌های جدید"),
    (FulfillmentStatus.QUEUED.value, "در صف چاپ"),
    (FulfillmentStatus.PRINTING.value, "در حال چاپ"),
    (FulfillmentStatus.PRINTED.value, "چاپ‌شده"),
    (FulfillmentStatus.QC_PENDING.value, "در انتظار کنترل کیفیت"),
    (FulfillmentStatus.QC_REJECTED.value, "مردود کیفیت"),
    (FulfillmentStatus.SORTING.value, "در حال تفکیک"),
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
    _: Operator = Depends(get_current_operator),
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

"""
Quality-control stage (BRD 5.5). QC works from the `qc_pending` queue,
grouped by print batch. Approve -> `sorting`; reject -> back to `queued`
(the print queue) with a recorded reason.
"""
import uuid
from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.deps import get_current_operator
from app.core.database import get_session
from app.models.operator import Operator
from app.models.order import FulfillmentStatus, Order, QCRejectReason
from app.services.serializers import order_summary

router = APIRouter(prefix="/api/ops/qc", tags=["ops-qc"])

# Persian labels for the reject-reason dropdown.
REJECT_REASONS: list[tuple[str, str]] = [
    (QCRejectReason.LOW_QUALITY.value, "کیفیت پایین"),
    (QCRejectReason.WRONG_COLOR.value, "رنگ نامناسب"),
    (QCRejectReason.WRONG_CUT.value, "برش اشتباه"),
    (QCRejectReason.INCOMPLETE_PRINT.value, "چاپ ناقص"),
    (QCRejectReason.PAPER_DAMAGE.value, "خرابی کاغذ"),
    (QCRejectReason.OTHER.value, "سایر"),
]


@router.get("/reasons")
def reject_reasons(_: Operator = Depends(get_current_operator)):
    return [{"key": key, "label": label} for key, label in REJECT_REASONS]


@router.get("/pending")
def pending(
    db: Session = Depends(get_session),
    _: Operator = Depends(get_current_operator),
):
    """`qc_pending` orders grouped by their print batch (BRD 5.5)."""
    orders = db.exec(
        select(Order).where(Order.fulfillment_status == FulfillmentStatus.QC_PENDING)
    ).all()

    groups: dict[str, list[dict]] = defaultdict(list)
    for order in orders:
        key = str(order.batch_id) if order.batch_id else "unbatched"
        groups[key].append(order_summary(db, order))

    return {
        "total": len(orders),
        "groups": [{"batch_id": bid, "orders": items} for bid, items in groups.items()],
    }


def _load_qc_order(db: Session, order_id: uuid.UUID) -> Order:
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="سفارش یافت نشد")
    if order.fulfillment_status != FulfillmentStatus.QC_PENDING:
        raise HTTPException(status_code=400, detail="سفارش در مرحله کنترل کیفیت نیست")
    return order


@router.post("/{order_id}/approve")
def approve(
    order_id: uuid.UUID,
    db: Session = Depends(get_session),
    _: Operator = Depends(get_current_operator),
):
    order = _load_qc_order(db, order_id)
    order.fulfillment_status = FulfillmentStatus.SORTING
    order.qc_reject_reason = None
    order.updated_at = datetime.utcnow()
    db.add(order)
    db.commit()
    return order_summary(db, order)


class RejectBody(BaseModel):
    reason: QCRejectReason


@router.post("/{order_id}/reject")
def reject(
    order_id: uuid.UUID,
    body: RejectBody,
    db: Session = Depends(get_session),
    _: Operator = Depends(get_current_operator),
):
    """Send the order back for reprint with a reason (BRD 5.5). We use the
    dedicated `qc_rejected` status (not raw `queued`) and drop it from its old
    batch, so the operator can re-batch it via POST /ops/batches, which accepts
    rejected orders. To the atelier it still reads as the coarse "printing"
    stage, so the customer view doesn't jump backwards."""
    order = _load_qc_order(db, order_id)
    order.fulfillment_status = FulfillmentStatus.QC_REJECTED
    order.qc_reject_reason = body.reason
    order.batch_id = None
    order.updated_at = datetime.utcnow()
    db.add(order)
    db.commit()
    return order_summary(db, order)

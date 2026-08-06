"""
Packing stage (BRD 5.7): an 8-item checklist must be fully ticked before an
order can be confirmed as `packed`.
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.deps import get_current_operator
from app.core.database import get_session
from app.models.operator import Operator
from app.models.order import FulfillmentStatus, Order
from app.services.serializers import order_summary

router = APIRouter(prefix="/api/ops/packing", tags=["ops-packing"])

# The 8 packing checklist items (BRD 5.7 #2), in display order.
CHECKLIST_ITEMS: list[tuple[str, str]] = [
    ("piece_count", "تعداد قطعات مطابقت دارد"),
    ("print_quality", "کیفیت چاپ تأیید شد"),
    ("cutting", "برش صحیح انجام شد"),
    ("recipient_info", "اطلاعات گیرنده بررسی شد"),
    ("address_label", "برچسب آدرس الصاق شد"),
    ("protective_cover", "محافظ/مقوا اضافه شد"),
    ("envelope", "داخل پاکت مناسب قرار گرفت"),
    ("sealed", "بسته پلمب شد"),
]
CHECKLIST_KEYS = [key for key, _ in CHECKLIST_ITEMS]


def _empty_checklist() -> dict:
    return {key: False for key in CHECKLIST_KEYS}


@router.get("/checklist-template")
def checklist_template(_: Operator = Depends(get_current_operator)):
    return {"items": [{"key": key, "label": label} for key, label in CHECKLIST_ITEMS]}


@router.get("/pending")
def pending(
    db: Session = Depends(get_session),
    _: Operator = Depends(get_current_operator),
):
    """Orders ready to pack or mid-packing, with their current checklist."""
    orders = db.exec(
        select(Order).where(
            Order.fulfillment_status.in_(
                [FulfillmentStatus.READY_TO_PACK, FulfillmentStatus.PACKING]
            )
        )
    ).all()
    result = []
    for order in orders:
        data = order_summary(db, order)
        data["packing_checklist"] = order.packing_checklist or _empty_checklist()
        result.append(data)
    return {"total": len(orders), "orders": result}


def _load_packable(db: Session, order_id: uuid.UUID) -> Order:
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="سفارش یافت نشد")
    if order.fulfillment_status not in (
        FulfillmentStatus.READY_TO_PACK,
        FulfillmentStatus.PACKING,
    ):
        raise HTTPException(status_code=400, detail="سفارش در مرحله بسته‌بندی نیست")
    return order


@router.post("/{order_id}/start")
def start(
    order_id: uuid.UUID,
    db: Session = Depends(get_session),
    _: Operator = Depends(get_current_operator),
):
    order = _load_packable(db, order_id)
    order.fulfillment_status = FulfillmentStatus.PACKING
    if order.packing_checklist is None:
        order.packing_checklist = _empty_checklist()
    order.updated_at = datetime.utcnow()
    db.add(order)
    db.commit()
    return order_summary(db, order)


class ChecklistPatch(BaseModel):
    # Partial update: only the toggled keys need to be sent.
    checklist: dict[str, bool]


@router.patch("/{order_id}/checklist")
def update_checklist(
    order_id: uuid.UUID,
    body: ChecklistPatch,
    db: Session = Depends(get_session),
    _: Operator = Depends(get_current_operator),
):
    order = _load_packable(db, order_id)
    current = dict(order.packing_checklist or _empty_checklist())
    for key, value in body.checklist.items():
        if key not in CHECKLIST_KEYS:
            raise HTTPException(status_code=400, detail=f"آیتم نامعتبر: {key}")
        current[key] = bool(value)
    order.packing_checklist = current
    order.fulfillment_status = FulfillmentStatus.PACKING
    order.updated_at = datetime.utcnow()
    db.add(order)
    db.commit()
    return {"id": str(order.id), "packing_checklist": current}


@router.post("/{order_id}/confirm")
def confirm(
    order_id: uuid.UUID,
    db: Session = Depends(get_session),
    _: Operator = Depends(get_current_operator),
):
    order = _load_packable(db, order_id)
    checklist = order.packing_checklist or _empty_checklist()
    if not all(checklist.get(key) for key in CHECKLIST_KEYS):
        raise HTTPException(
            status_code=400, detail="همه موارد چک‌لیست باید تأیید شوند"
        )
    order.fulfillment_status = FulfillmentStatus.PACKED
    order.updated_at = datetime.utcnow()
    db.add(order)
    db.commit()
    return order_summary(db, order)

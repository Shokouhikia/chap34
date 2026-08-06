"""
Sorting stage (BRD 5.6): the operator counts the physical pieces for each
order and confirms they match the ordered quantity. A mismatch is refused
with a 400 so the frontend keeps the confirm button disabled until it's
resolved; a match advances the order to `ready_to_pack`.
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

router = APIRouter(prefix="/api/ops/sorting", tags=["ops-sorting"])


@router.get("/pending")
def pending(
    db: Session = Depends(get_session),
    _: Operator = Depends(get_current_operator),
):
    orders = db.exec(
        select(Order).where(Order.fulfillment_status == FulfillmentStatus.SORTING)
    ).all()
    return {"total": len(orders), "orders": [order_summary(db, o) for o in orders]}


class ConfirmBody(BaseModel):
    actual_piece_count: int


@router.post("/{order_id}/confirm")
def confirm(
    order_id: uuid.UUID,
    body: ConfirmBody,
    db: Session = Depends(get_session),
    _: Operator = Depends(get_current_operator),
):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="سفارش یافت نشد")
    if order.fulfillment_status != FulfillmentStatus.SORTING:
        raise HTTPException(status_code=400, detail="سفارش در مرحله تفکیک نیست")

    order.actual_piece_count = body.actual_piece_count
    if body.actual_piece_count != order.quantity:
        db.add(order)
        db.commit()
        raise HTTPException(
            status_code=400,
            detail=(
                f"مغایرت تعداد: انتظار {order.quantity} قطعه، "
                f"شمارش‌شده {body.actual_piece_count} قطعه"
            ),
        )

    order.fulfillment_status = FulfillmentStatus.READY_TO_PACK
    order.updated_at = datetime.utcnow()
    db.add(order)
    db.commit()
    return order_summary(db, order)

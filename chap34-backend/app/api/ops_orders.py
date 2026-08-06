"""
Operations order list + print-batch creation (BRD 5.4 #1-4) and admin
atelier assignment (spec open-question #5).
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.deps import get_current_operator
from app.core.database import get_session
from app.models.atelier import Atelier
from app.models.operator import Operator
from app.models.order import FulfillmentStatus, Order, SheetSize
from app.models.print_batch import PrintBatch, PrintBatchStatus
from app.services.codes import next_batch_code
from app.services.serializers import order_summary

router = APIRouter(prefix="/api/ops", tags=["ops-orders"])


@router.get("/orders")
def list_orders(
    db: Session = Depends(get_session),
    _: Operator = Depends(get_current_operator),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=30, ge=1, le=100),
):
    """Search by order code / customer name and filter by operational status
    (BRD 5.4 #1-2)."""
    orders = db.exec(select(Order)).all()

    if status and status != "all":
        try:
            wanted = FulfillmentStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail="وضعیت نامعتبر است")
        orders = [o for o in orders if o.fulfillment_status == wanted]

    if search:
        needle = search.strip().lower()
        # Match against order code or customer name (via address).
        from app.services.fulfillment import customer_name_for

        orders = [
            o
            for o in orders
            if needle in o.order_code.lower()
            or needle in customer_name_for(db, o).lower()
        ]

    orders.sort(key=lambda o: o.created_at, reverse=True)
    total = len(orders)
    start = (page - 1) * page_size
    page_items = orders[start:start + page_size]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "orders": [order_summary(db, o) for o in page_items],
    }


class CreateBatchBody(BaseModel):
    order_ids: list[uuid.UUID]
    sheet_size: SheetSize = SheetSize.SIZE_10X15


@router.post("/batches")
def create_batch(
    body: CreateBatchBody,
    db: Session = Depends(get_session),
    operator: Operator = Depends(get_current_operator),
):
    """Create a print batch from `registered` orders, moving them to `queued`
    (BRD 5.4 #3-4)."""
    if not body.order_ids:
        raise HTTPException(status_code=400, detail="حداقل یک سفارش را انتخاب کنید")

    orders: list[Order] = []
    for oid in body.order_ids:
        order = db.get(Order, oid)
        if not order:
            raise HTTPException(status_code=404, detail=f"سفارش {oid} یافت نشد")
        # Fresh orders (registered) plus QC-rejected orders awaiting reprint.
        if order.fulfillment_status not in (
            FulfillmentStatus.REGISTERED,
            FulfillmentStatus.QC_REJECTED,
        ):
            raise HTTPException(
                status_code=400,
                detail=f"سفارش {order.order_code} قابل افزودن به بچ چاپ نیست",
            )
        orders.append(order)

    batch = PrintBatch(
        code=next_batch_code(db),
        sheet_size=body.sheet_size,
        status=PrintBatchStatus.QUEUED,
        operator_id=operator.id,
        order_count=len(orders),
        piece_count=sum(o.quantity for o in orders),
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    for order in orders:
        order.batch_id = batch.id
        order.fulfillment_status = FulfillmentStatus.QUEUED
        order.updated_at = datetime.utcnow()
        db.add(order)
    db.commit()

    return {
        "id": str(batch.id),
        "code": batch.code,
        "order_count": batch.order_count,
        "piece_count": batch.piece_count,
        "sheet_size": batch.sheet_size.value,
    }


class AssignAtelierBody(BaseModel):
    atelier_id: uuid.UUID


@router.patch("/orders/{order_id}/assign-atelier")
def assign_atelier(
    order_id: uuid.UUID,
    body: AssignAtelierBody,
    db: Session = Depends(get_session),
    _: Operator = Depends(get_current_operator),
):
    """Assign / reassign an order to an atelier (spec open-question #5:
    manual admin assignment; automatic round-robin is out of scope)."""
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="سفارش یافت نشد")
    atelier = db.get(Atelier, body.atelier_id)
    if not atelier or not atelier.is_active:
        raise HTTPException(status_code=404, detail="آتلیه یافت نشد یا غیرفعال است")

    order.atelier_id = atelier.id
    order.updated_at = datetime.utcnow()
    db.add(order)
    db.commit()
    return order_summary(db, order)

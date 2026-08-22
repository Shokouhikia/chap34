"""
Atelier panel API (BRD 5.2). A staff member with ATELIER role sees
orders and can print sheets / shipping labels and register tracking codes.

Auth here uses staff tokens (JWT + bcrypt), separate from the customer OTP flow.
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.deps import require_staff_role
from app.core.database import get_session
from app.models.staff import StaffRole
from app.models.order import Order, SheetSize
from app.services import fulfillment
from app.services.labels import render_shipping_label
from app.services.rendering import render_output
from app.services.serializers import order_detail, order_summary
from app.services.sheet_layout import build_sheets
from app.services.status_mapping import (
    ATELIER_STAGES,
    count_by_stage,
    entry_status_for_stage,
    is_valid_stage,
    next_atelier_stage,
    statuses_for_stage,
)

router = APIRouter(prefix="/api/atelier", tags=["atelier"])

PAGE_SIZE = 20


def _atelier_orders_query():
    return select(Order)


@router.get("/orders")
def list_orders(
    db: Session = Depends(get_session),
    staff=Depends(require_staff_role(StaffRole.ATELIER)),
    stage: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
):
    all_orders = fulfillment.filter_orders_by_province(db, staff, db.exec(_atelier_orders_query()).all())
    counts = count_by_stage([o.fulfillment_status for o in all_orders])

    filtered = all_orders
    if stage and stage != "all":
        if not is_valid_stage(stage):
            raise HTTPException(status_code=400, detail="مرحله نامعتبر است")
        allowed = set(statuses_for_stage(stage))
        filtered = [o for o in all_orders if o.fulfillment_status in allowed]

    filtered.sort(key=lambda o: o.created_at, reverse=True)
    start = (page - 1) * PAGE_SIZE
    page_items = filtered[start:start + PAGE_SIZE]

    return {
        "stages": [{"key": key, "label": label, "count": counts[key]} for key, label in ATELIER_STAGES],
        "total": len(filtered),
        "page": page,
        "page_size": PAGE_SIZE,
        "orders": [order_summary(db, o) for o in page_items],
    }


def _load_order(db: Session, order_id: uuid.UUID) -> Order:
    order = fulfillment.get_order_or_404(db, order_id)
    return order


@router.get("/orders/{order_id}")
def get_order(
    order_id: uuid.UUID,
    db: Session = Depends(get_session),
    staff=Depends(require_staff_role(StaffRole.ATELIER)),
):
    order = _load_order(db, order_id)
    return order_detail(db, order)


@router.post("/orders/{order_id}/advance")
def advance_order(
    order_id: uuid.UUID,
    db: Session = Depends(get_session),
    staff=Depends(require_staff_role(StaffRole.ATELIER)),
):
    order = _load_order(db, order_id)
    next_stage = next_atelier_stage(order.fulfillment_status)
    if next_stage is None:
        raise HTTPException(status_code=400, detail="سفارش در مرحله نهایی است")

    if next_stage == "shipped" and not (order.tracking_code and order.tracking_code.strip()):
        raise HTTPException(status_code=400, detail="برای پست کردن، ابتدا کد رهگیری را ثبت کنید")

    new_status = entry_status_for_stage(next_stage)
    order.fulfillment_status = new_status
    order.updated_at = datetime.utcnow()
    if next_stage == "shipped":
        order.shipped_at = datetime.utcnow()
    if next_stage == "delivered":
        order.delivered_at = datetime.utcnow()
    db.add(order)
    db.commit()
    db.refresh(order)
    return order_summary(db, order)


class TrackingBody(BaseModel):
    tracking_code: str


@router.post("/orders/{order_id}/tracking-code")
def set_tracking_code(
    order_id: uuid.UUID,
    body: TrackingBody,
    db: Session = Depends(get_session),
    staff=Depends(require_staff_role(StaffRole.ATELIER)),
):
    order = _load_order(db, order_id)
    code = (body.tracking_code or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="کد رهگیری الزامی است")
    order.tracking_code = code
    order.updated_at = datetime.utcnow()
    db.add(order)
    db.commit()
    db.refresh(order)
    return order_summary(db, order)


# --------------------------------------------------------------------------
# Printing
# --------------------------------------------------------------------------
def _file_response(payload: bytes, media_type: str, filename: str) -> Response:
    return Response(
        content=payload,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.get("/orders/{order_id}/print-sheet")
def print_single_sheet(
    order_id: uuid.UUID,
    db: Session = Depends(get_session),
    staff=Depends(require_staff_role(StaffRole.ATELIER)),
    format: str = Query(default="png"),
    sheet_size: SheetSize = Query(default=SheetSize.SIZE_10X15),
):
    order = _load_order(db, order_id)
    sheet_orders = fulfillment.build_sheet_orders(db, [order])
    images = build_sheets(sheet_orders, sheet_size)
    payload, media_type = render_output(images, format)
    ext = "pdf" if media_type == "application/pdf" else "png"
    return _file_response(payload, media_type, f"{order.order_code}.{ext}")


class PrintQueueBody(BaseModel):
    order_ids: list[uuid.UUID]
    sheet_size: SheetSize = SheetSize.SIZE_10X15
    format: str = "pdf"


@router.post("/print-queue/print")
def print_queue(
    body: PrintQueueBody,
    db: Session = Depends(get_session),
    staff=Depends(require_staff_role(StaffRole.ATELIER)),
):
    if not body.order_ids:
        raise HTTPException(status_code=400, detail="حداقل یک سفارش را انتخاب کنید")

    orders = [_load_order(db, oid) for oid in body.order_ids]
    sheet_orders = fulfillment.build_sheet_orders(db, orders)
    images = build_sheets(sheet_orders, body.sheet_size)
    payload, media_type = render_output(images, body.format)
    ext = "pdf" if media_type == "application/pdf" else "png"
    return _file_response(payload, media_type, f"print-queue.{ext}")


@router.get("/orders/{order_id}/shipping-label")
def shipping_label(
    order_id: uuid.UUID,
    db: Session = Depends(get_session),
    staff=Depends(require_staff_role(StaffRole.ATELIER)),
    format: str = Query(default="png"),
):
    order = _load_order(db, order_id)
    label = render_shipping_label(fulfillment.build_label_data(db, order))
    payload, media_type = render_output([label], format)
    ext = "pdf" if media_type == "application/pdf" else "png"
    return _file_response(payload, media_type, f"{order.order_code}-label.{ext}")

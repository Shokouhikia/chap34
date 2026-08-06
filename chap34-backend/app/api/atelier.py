"""
Atelier panel API (BRD 5.2). An atelier logs in with a real password, sees
ONLY the orders assigned to it, watches them move through the coarse 5-stage
view, and can print sheets / shipping labels and register tracking codes.

Auth here is real (JWT + bcrypt), separate from the fake customer OTP flow.
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.deps import get_current_atelier
from app.core.database import get_session
from app.core.security import Actor, create_access_token, hash_password, verify_password
from app.models.atelier import Atelier
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


# --------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------
class LoginBody(BaseModel):
    username: str
    password: str


class ChangePasswordBody(BaseModel):
    old_password: str
    new_password: str


@router.post("/login")
def login(body: LoginBody, db: Session = Depends(get_session)):
    atelier = db.exec(
        select(Atelier).where(Atelier.username == body.username)
    ).first()
    if not atelier or not verify_password(body.password, atelier.password_hash):
        raise HTTPException(status_code=401, detail="نام کاربری یا رمز عبور نادرست است")
    if not atelier.is_active:
        raise HTTPException(status_code=403, detail="حساب آتلیه غیرفعال است")

    atelier.last_login_at = datetime.utcnow()
    db.add(atelier)
    db.commit()

    token = create_access_token(atelier.id, Actor.ATELIER)
    return {"token": token, "name": atelier.name, "username": atelier.username}


@router.post("/change-password")
def change_password(
    body: ChangePasswordBody,
    db: Session = Depends(get_session),
    atelier: Atelier = Depends(get_current_atelier),
):
    if not verify_password(body.old_password, atelier.password_hash):
        raise HTTPException(status_code=400, detail="رمز عبور فعلی نادرست است")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="رمز جدید باید حداقل ۶ کاراکتر باشد")

    atelier.password_hash = hash_password(body.new_password)
    db.add(atelier)
    db.commit()
    return {"ok": True}


@router.get("/me")
def me(atelier: Atelier = Depends(get_current_atelier)):
    return {"name": atelier.name, "username": atelier.username}


# --------------------------------------------------------------------------
# Orders
# --------------------------------------------------------------------------
def _atelier_orders_query(atelier_id: uuid.UUID):
    return select(Order).where(Order.atelier_id == atelier_id)


@router.get("/orders")
def list_orders(
    db: Session = Depends(get_session),
    atelier: Atelier = Depends(get_current_atelier),
    stage: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
):
    """Assigned orders, optionally filtered to one coarse stage, plus a count
    per stage for the filter tabs (BRD 5.2 #2)."""
    all_orders = db.exec(_atelier_orders_query(atelier.id)).all()
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


def _load_owned_order(db: Session, atelier: Atelier, order_id: uuid.UUID) -> Order:
    order = fulfillment.get_order_or_404(db, order_id)
    if order.atelier_id != atelier.id:
        raise HTTPException(status_code=404, detail="سفارش یافت نشد")
    return order


@router.get("/orders/{order_id}")
def get_order(
    order_id: uuid.UUID,
    db: Session = Depends(get_session),
    atelier: Atelier = Depends(get_current_atelier),
):
    order = _load_owned_order(db, atelier, order_id)
    return order_detail(db, order)


@router.post("/orders/{order_id}/advance")
def advance_order(
    order_id: uuid.UUID,
    db: Session = Depends(get_session),
    atelier: Atelier = Depends(get_current_atelier),
):
    """Push the order to the next coarse stage. Advancing into 'shipped'
    without a tracking code is refused (BRD 5.2 #4)."""
    order = _load_owned_order(db, atelier, order_id)
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
    atelier: Atelier = Depends(get_current_atelier),
):
    order = _load_owned_order(db, atelier, order_id)
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
    atelier: Atelier = Depends(get_current_atelier),
    format: str = Query(default="png"),
    sheet_size: SheetSize = Query(default=SheetSize.SIZE_10X15),
):
    order = _load_owned_order(db, atelier, order_id)
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
    atelier: Atelier = Depends(get_current_atelier),
):
    """Group-print several of the atelier's own orders onto shared sheets
    (BRD 5.2 #7-9)."""
    if not body.order_ids:
        raise HTTPException(status_code=400, detail="حداقل یک سفارش را انتخاب کنید")

    orders = [_load_owned_order(db, atelier, oid) for oid in body.order_ids]
    sheet_orders = fulfillment.build_sheet_orders(db, orders)
    images = build_sheets(sheet_orders, body.sheet_size)
    payload, media_type = render_output(images, body.format)
    ext = "pdf" if media_type == "application/pdf" else "png"
    return _file_response(payload, media_type, f"print-queue.{ext}")


@router.get("/orders/{order_id}/shipping-label")
def shipping_label(
    order_id: uuid.UUID,
    db: Session = Depends(get_session),
    atelier: Atelier = Depends(get_current_atelier),
    format: str = Query(default="png"),
):
    order = _load_owned_order(db, atelier, order_id)
    label = render_shipping_label(fulfillment.build_label_data(db, order))
    payload, media_type = render_output([label], format)
    ext = "pdf" if media_type == "application/pdf" else "png"
    return _file_response(payload, media_type, f"{order.order_code}-label.{ext}")

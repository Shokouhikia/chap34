"""
Shared fulfillment helpers used by BOTH the atelier and operations panels,
so the same behaviour isn't reimplemented twice:

- loading an Order's finished photo + customer name into a SheetOrder
- registering a tracking code and moving an order to `shipped`

Everything here works on `Order.fulfillment_status` only and never touches
the customer-facing `Order.status` (architecture decision #1).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from pathlib import Path

from fastapi import HTTPException
from PIL import Image
from sqlmodel import Session

from app.models.address import Address
from app.models.order import FulfillmentStatus, Order
from app.services.sheet_layout import SheetOrder

# app/services/ -> app/ -> app/static
_STATIC_ROOT = Path(__file__).resolve().parent.parent / "static"


def load_photo_image(result_file_url: str | None) -> Image.Image | None:
    """Load a finished photo off disk from its `/static/...` URL. Returns None
    (so the sheet renders a placeholder) if the file is missing - the demo's
    seed orders may not have a real generated image."""
    if not result_file_url:
        return None
    rel = result_file_url.removeprefix("/static/").lstrip("/")
    path = _STATIC_ROOT / rel
    if not path.exists():
        return None
    try:
        img = Image.open(path)
        img.load()
        return img
    except Exception:
        return None


def customer_name_for(db: Session, order: Order) -> str:
    address = db.get(Address, order.address_id)
    return address.full_name if address else "—"


def to_sheet_order(db: Session, order: Order, photo_result_url: str | None) -> SheetOrder:
    return SheetOrder(
        order_code=order.order_code,
        customer_name=customer_name_for(db, order),
        quantity=order.quantity,
        photo=load_photo_image(photo_result_url),
    )


def build_sheet_orders(db: Session, orders: list[Order]) -> list[SheetOrder]:
    """Turn a list of Order rows into SheetOrder specs, resolving each order's
    finished photo. Kept here so atelier single/queue printing and ops batch
    printing all go through the same path."""
    from app.models.photo import Photo  # local import avoids a cycle at import time

    result: list[SheetOrder] = []
    for order in orders:
        photo = db.get(Photo, order.photo_id)
        result.append(to_sheet_order(db, order, photo.result_file_url if photo else None))
    return result


def register_tracking_and_ship(
    db: Session, order: Order, tracking_code: str
) -> Order:
    """Attach a manually-entered postal tracking code and move the order to
    `shipped`. Shared by the atelier panel and the ops shipments panel
    (BRD 5.2 #4 / 5.8 #7)."""
    code = (tracking_code or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="کد رهگیری الزامی است")

    order.tracking_code = code
    order.fulfillment_status = FulfillmentStatus.SHIPPED
    order.shipped_at = datetime.utcnow()
    order.updated_at = datetime.utcnow()
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def get_order_or_404(db: Session, order_id: uuid.UUID) -> Order:
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="سفارش یافت نشد")
    return order


def build_label_data(db: Session, order: Order):
    """Assemble the postal-label fields for an order from its address.
    Shared by the atelier and ops label/manifest endpoints."""
    from app.services.labels import LabelData  # local import avoids a cycle

    address = db.get(Address, order.address_id)
    return LabelData(
        order_code=order.order_code,
        recipient_name=address.full_name if address else "—",
        province=address.province if address else "—",
        city=address.city if address else "—",
        full_address=address.full_address if address else "—",
        postal_code=address.postal_code if address else "—",
        phone=address.phone_number if address else "—",
        tracking_code=order.tracking_code,
    )

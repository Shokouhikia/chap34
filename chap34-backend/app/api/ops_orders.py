"""
Operations order list + print-batch creation (BRD 5.4 #1-4).
"""
import csv
import io
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import or_
from sqlmodel import Session, func, select

from app.api.deps import require_staff_role
from app.core.database import get_session
from app.models.address import Address
from app.models.staff import StaffRole
from app.models.order import FulfillmentStatus, Order, PrintSize, SheetSize
from app.models.print_batch import PrintBatch, PrintBatchStatus
from app.models.user import User
from app.services.codes import next_batch_code
from app.services.serializers import order_summary

router = APIRouter(prefix="/api/ops", tags=["ops-orders"])


@router.get("/orders")
def list_orders(
    db: Session = Depends(get_session),
    staff=Depends(require_staff_role(StaffRole.ATELIER)),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    exclude_batched: bool = Query(default=True),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=30, ge=1, le=100),
):
    from app.services import fulfillment

    orders = fulfillment.filter_orders_by_province(db, staff, db.exec(select(Order)).all())

    # Once an order is in a print batch it has been handed off to the batches
    # screen, so it drops out of the "to process" queue by default. Callers
    # can pass exclude_batched=false to see the full history again.
    if exclude_batched:
        orders = [o for o in orders if o.batch_id is None]

    if status and status != "all":
        try:
            wanted = FulfillmentStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail="وضعیت نامعتبر است")
        orders = [o for o in orders if o.fulfillment_status == wanted]

    if search:
        needle = search.strip().lower()
        from app.services.fulfillment import customer_name_for

        orders = [
            o
            for o in orders
            if needle in o.order_code.lower()
            or needle in customer_name_for(db, o).lower()
        ]

    # FIFO: oldest first, so the print queue is worked in the order customers
    # placed their orders and old ones can't starve behind new arrivals.
    orders.sort(key=lambda o: o.created_at)
    total = len(orders)
    start = (page - 1) * page_size
    page_items = orders[start:start + page_size]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "orders": [order_summary(db, o) for o in page_items],
    }


def _parse_day(value: str | None, field: str) -> datetime | None:
    """Parse a YYYY-MM-DD query param into a datetime, or None if absent."""
    if not value:
        return None
    try:
        return datetime.strptime(value.strip(), "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail=f"فرمت {field} باید YYYY-MM-DD باشد")


def _report_filters(
    staff,
    phone: str | None,
    name: str | None,
    status: str | None,
    date_from: str | None,
    date_to: str | None,
) -> list:
    """Build the SQL conditions shared by the JSON report and its CSV export,
    so the exported file always matches exactly what's on screen."""
    conditions = []

    # Admin sees every province; an atelier account only sees the provinces
    # it's been granted (unrestricted if none were assigned) - see
    # fulfillment.filter_orders_by_province for the same rule elsewhere.
    if staff.role == StaffRole.ATELIER and staff.provinces:
        conditions.append(Address.province.in_(staff.provinces))

    if status and status != "all":
        try:
            conditions.append(Order.fulfillment_status == FulfillmentStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail="وضعیت نامعتبر است")

    if phone:
        needle = f"%{phone.strip()}%"
        # Match either the delivery contact or the account phone - staff
        # searching a number shouldn't have to know which one it was.
        conditions.append(
            or_(Address.phone_number.like(needle), User.phone_number.like(needle))
        )

    if name:
        conditions.append(Address.full_name.like(f"%{name.strip()}%"))

    start = _parse_day(date_from, "«از تاریخ»")
    if start:
        conditions.append(Order.created_at >= start)

    end = _parse_day(date_to, "«تا تاریخ»")
    if end:
        # Inclusive of the whole end day.
        conditions.append(Order.created_at < end + timedelta(days=1))

    return conditions


def _report_row(db: Session, order: Order, address: Address, user: User) -> dict:
    data = order_summary(db, order)
    data.update(
        {
            "phone": address.phone_number,
            "account_phone": user.phone_number,
            "province": address.province,
            "city": address.city,
            "full_address": address.full_address,
            "postal_code": address.postal_code,
            "total_price": order.total_price,
        }
    )
    return data


@router.get("/orders/report")
def orders_report(
    db: Session = Depends(get_session),
    # Admin sees the report too (it's the follow-up/lookup screen for the
    # whole shop, unrestricted by province); the rest of /api/ops stays
    # atelier-only.
    staff=Depends(require_staff_role(StaffRole.ATELIER, StaffRole.ADMIN)),
    phone: str | None = Query(default=None),
    name: str | None = Query(default=None),
    status: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    """Full order report for atelier follow-up. Unlike `list_orders`, this
    filters and paginates in SQL rather than loading the whole table."""
    conditions = _report_filters(staff, phone, name, status, date_from, date_to)

    total = db.exec(
        select(func.count())
        .select_from(Order)
        .join(Address, Order.address_id == Address.id)
        .join(User, Order.user_id == User.id)
        .where(*conditions)
    ).one()

    rows = db.exec(
        select(Order, Address, User)
        .join(Address, Order.address_id == Address.id)
        .join(User, Order.user_id == User.id)
        .where(*conditions)
        .order_by(Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "orders": [_report_row(db, o, a, u) for o, a, u in rows],
    }


CSV_COLUMNS: list[tuple[str, str]] = [
    ("order_code", "کد سفارش"),
    ("created_at", "تاریخ ثبت"),
    ("customer_name", "نام گیرنده"),
    ("phone", "تلفن"),
    ("size", "سایز"),
    ("paper_type", "جنس کاغذ"),
    ("quantity", "تعداد"),
    ("total_price", "مبلغ"),
    ("fulfillment_status", "وضعیت"),
    ("batch_code", "شماره بچ"),
    ("tracking_code", "کد رهگیری"),
    ("province", "استان"),
    ("city", "شهر"),
    ("postal_code", "کد پستی"),
    ("full_address", "آدرس"),
]

# The export is read by Persian-speaking staff, so enum values get translated
# rather than dumped raw ("glossy", "packed", ...).
CSV_SIZE_LABELS = {"3x4": "۳×۴", "6x8": "۶×۸"}
CSV_PAPER_LABELS = {"glossy": "گلاسه", "matte": "مات"}
CSV_STATUS_LABELS = {
    "registered": "ثبت‌شده",
    "queued": "در صف چاپ",
    "printing": "در حال چاپ",
    "printed": "چاپ‌شده",
    "ready_to_pack": "آماده بسته‌بندی",
    "packing": "در حال بسته‌بندی",
    "packed": "بسته‌بندی‌شده",
    "ready_to_ship": "آماده ارسال",
    "handed_to_post": "تحویل به پست",
    "shipped": "ارسال‌شده",
    "delivered": "تحویل مشتری",
}


def _csv_value(key: str, data: dict):
    """Human-readable cell value for the export."""
    raw = data.get(key)
    if raw is None:
        return ""
    if key == "size":
        return CSV_SIZE_LABELS.get(raw, raw)
    if key == "paper_type":
        return CSV_PAPER_LABELS.get(raw, raw)
    if key == "fulfillment_status":
        return CSV_STATUS_LABELS.get(raw, raw)
    if key == "created_at":
        # ISO timestamp -> "YYYY-MM-DD HH:MM" (sortable, and Excel parses it).
        return str(raw)[:16].replace("T", " ")
    return raw


@router.get("/orders/report.csv")
def orders_report_csv(
    db: Session = Depends(get_session),
    staff=Depends(require_staff_role(StaffRole.ATELIER, StaffRole.ADMIN)),
    phone: str | None = Query(default=None),
    name: str | None = Query(default=None),
    status: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
):
    """Same filters as /orders/report, unpaginated, as a CSV for Excel."""
    conditions = _report_filters(staff, phone, name, status, date_from, date_to)

    rows = db.exec(
        select(Order, Address, User)
        .join(Address, Order.address_id == Address.id)
        .join(User, Order.user_id == User.id)
        .where(*conditions)
        .order_by(Order.created_at.desc())
    ).all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([label for _, label in CSV_COLUMNS])
    for order, address, user in rows:
        data = _report_row(db, order, address, user)
        writer.writerow([_csv_value(key, data) for key, _ in CSV_COLUMNS])

    # Excel only detects UTF-8 in a CSV if it starts with a BOM; without it
    # every Persian column renders as mojibake.
    payload = ("﻿" + buffer.getvalue()).encode("utf-8")
    return Response(
        content=payload,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="orders-report.csv"'},
    )


class CreateBatchBody(BaseModel):
    order_ids: list[uuid.UUID]
    # Optional: when omitted the sheet size is derived from the print size
    # (see sheet_size_for_print_size). 6x8 on 10x15 paper only fits ONE piece
    # per sheet vs NINE on A4, so letting this default silently was wasting
    # ~6x the paper on every 6x8 batch.
    sheet_size: SheetSize | None = None


def sheet_size_for_print_size(print_size: PrintSize) -> SheetSize:
    """Cheapest paper for a given print size at the current cell geometry."""
    return SheetSize.SIZE_A4 if print_size == PrintSize.SIZE_6X8 else SheetSize.SIZE_10X15


@router.post("/batches")
def create_batch(
    body: CreateBatchBody,
    db: Session = Depends(get_session),
    staff=Depends(require_staff_role(StaffRole.ATELIER)),
):
    if not body.order_ids:
        raise HTTPException(status_code=400, detail="حداقل یک سفارش را انتخاب کنید")

    orders: list[Order] = []
    for oid in body.order_ids:
        order = db.get(Order, oid)
        if not order:
            raise HTTPException(status_code=404, detail=f"سفارش {oid} یافت نشد")
        if order.fulfillment_status != FulfillmentStatus.REGISTERED:
            raise HTTPException(
                status_code=400,
                detail=f"سفارش {order.order_code} قابل افزودن به بچ چاپ نیست",
            )
        # A batch is one physical print run: every order in it must print at
        # the same size on the same paper, or the run is impossible.
        if orders:
            if order.size != orders[0].size:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"سفارش {order.order_code} سایز متفاوتی دارد؛ "
                        "همه‌ی سفارش‌های یک بچ باید هم‌سایز باشند"
                    ),
                )
            if order.paper_type != orders[0].paper_type:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"سفارش {order.order_code} جنس کاغذ متفاوتی دارد؛ "
                        "همه‌ی سفارش‌های یک بچ باید یک جنس کاغذ داشته باشند"
                    ),
                )
        orders.append(order)

    sheet_size = body.sheet_size or sheet_size_for_print_size(orders[0].size)

    batch = PrintBatch(
        code=next_batch_code(db),
        sheet_size=sheet_size,
        status=PrintBatchStatus.QUEUED,
        staff_id=staff.id,
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

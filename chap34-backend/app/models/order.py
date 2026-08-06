import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class PrintSize(str, Enum):
    SIZE_3X4 = "3x4"
    SIZE_6X8 = "6x8"


class PaperType(str, Enum):
    GLOSSY = "glossy"
    MATTE = "matte"


class OrderStatus(str, Enum):
    CREATED = "created"
    PAID = "paid"
    PREPARING = "preparing"
    PRINTED = "printed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class FulfillmentStatus(str, Enum):
    """
    The 13-stage operational lifecycle from BRD 5.9, tracked independently of
    the customer-facing `status` field (which powers the customer tracking
    screen). The atelier and operations panels work ONLY with this field.
    """
    REGISTERED = "registered"
    QUEUED = "queued"
    PRINTING = "printing"
    PRINTED = "printed"
    QC_PENDING = "qc_pending"
    QC_REJECTED = "qc_rejected"       # sent back to the print queue with a reason
    SORTING = "sorting"
    READY_TO_PACK = "ready_to_pack"
    PACKING = "packing"
    PACKED = "packed"
    READY_TO_SHIP = "ready_to_ship"
    HANDED_TO_POST = "handed_to_post"
    SHIPPED = "shipped"
    DELIVERED = "delivered"


class SheetSize(str, Enum):
    """Physical print-sheet size. Deliberately separate from PrintSize (the
    3x4/6x8 photo size) - a sheet holds many photos, so the two are
    different concepts even if the values look similar."""
    SIZE_10X15 = "10x15"
    SIZE_A4 = "a4"


class QCRejectReason(str, Enum):
    LOW_QUALITY = "low_quality"           # کیفیت پایین
    WRONG_COLOR = "wrong_color"           # رنگ نامناسب
    WRONG_CUT = "wrong_cut"               # برش اشتباه
    INCOMPLETE_PRINT = "incomplete_print" # چاپ ناقص
    PAPER_DAMAGE = "paper_damage"         # خرابی کاغذ
    OTHER = "other"                       # سایر


class Order(SQLModel, table=True):
    """
    A print order placed against one finished (AI-generated) photo,
    shipped to one address. Price is always computed and re-validated
    server-side from the pricing matrix (app/core/pricing.py) - the
    frontend's displayed total is never trusted as-is.
    """
    __tablename__ = "orders"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    photo_id: uuid.UUID = Field(foreign_key="photos.id")
    address_id: uuid.UUID = Field(foreign_key="addresses.id")

    size: PrintSize
    paper_type: PaperType
    quantity: int

    # Total price in Tomans, computed server-side from the pricing matrix.
    total_price: int

    status: OrderStatus = Field(default=OrderStatus.CREATED, index=True)

    # --- Atelier / operations fulfillment fields (new panels) ---------------
    # All nullable / defaulted so the migration doesn't break existing rows.

    # Human-searchable code, e.g. ORD-000123. Filled in at create_order time.
    order_code: str = Field(index=True, unique=True)

    atelier_id: uuid.UUID | None = Field(
        default=None, foreign_key="ateliers.id", index=True
    )
    fulfillment_status: FulfillmentStatus = Field(
        default=FulfillmentStatus.REGISTERED, index=True
    )

    batch_id: uuid.UUID | None = Field(
        default=None, foreign_key="print_batches.id", index=True
    )
    shipment_id: uuid.UUID | None = Field(
        default=None, foreign_key="shipments.id", index=True
    )

    tracking_code: str | None = Field(default=None, max_length=50)
    shipped_at: datetime | None = None
    delivered_at: datetime | None = None

    qc_reject_reason: QCRejectReason | None = None

    # Piece count entered at the sorting stage; compared against `quantity`.
    actual_piece_count: int | None = None
    # The 8-item packing checklist (BRD 5.7 #2), as {item_key: bool}.
    packing_checklist: dict | None = Field(default=None, sa_column=Column(JSONB))

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class OrderStatusHistory(SQLModel, table=True):
    """
    Append-only log of status changes for an order. This is what powers
    the tracking timeline screen - one row per transition.
    """
    __tablename__ = "order_status_history"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    order_id: uuid.UUID = Field(foreign_key="orders.id", index=True)

    status: OrderStatus
    note: str | None = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

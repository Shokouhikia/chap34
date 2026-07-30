import uuid
from datetime import datetime
from enum import Enum

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

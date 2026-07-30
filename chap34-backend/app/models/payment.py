import uuid
from datetime import datetime
from enum import Enum

from sqlmodel import Field, SQLModel


class PaymentGateway(str, Enum):
    ZARINPAL = "zarinpal"
    IDPAY = "idpay"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"


class Payment(SQLModel, table=True):
    """One payment attempt against an order. An order can have several
    attempts if earlier ones fail, so this is not 1:1 with Order."""
    __tablename__ = "payments"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    order_id: uuid.UUID = Field(foreign_key="orders.id", index=True)

    gateway: PaymentGateway
    authority: str | None = Field(default=None, max_length=100)
    ref_id: str | None = Field(default=None, max_length=100)

    amount: int
    status: PaymentStatus = Field(default=PaymentStatus.PENDING)

    paid_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class PrintJob(SQLModel, table=True):
    """
    Fulfillment record for one order: which print partner handled it,
    and the shipping tracking code once it's on its way.
    """
    __tablename__ = "print_jobs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    order_id: uuid.UUID = Field(foreign_key="orders.id", index=True, unique=True)

    printer_partner: str | None = Field(default=None, max_length=50)
    tracking_code: str | None = Field(default=None, max_length=50)

    shipped_at: datetime | None = None
    delivered_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class Shipment(SQLModel, table=True):
    """
    A batch of `packed` orders grouped for a single hand-off to the postal
    service. Orders point back here via Order.shipment_id. Creating a
    shipment moves its orders to `ready_to_ship`; handing it to the post
    moves them all to `handed_to_post`.
    """
    __tablename__ = "shipments"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    # Human-readable code, e.g. SHIP-0001.
    code: str = Field(unique=True, index=True, max_length=20)

    operator_id: uuid.UUID = Field(foreign_key="operators.id", index=True)

    order_count: int = Field(default=0)

    handed_to_post_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

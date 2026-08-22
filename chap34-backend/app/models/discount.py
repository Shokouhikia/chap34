import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class DiscountCode(SQLModel, table=True):
    __tablename__ = "discount_codes"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    code: str = Field(unique=True, index=True, max_length=30)
    percent: int
    active: bool = Field(default=True)
    # None = unlimited. Otherwise a customer can only redeem this code this
    # many times (counted from their own non-cancelled orders).
    max_uses_per_user: int | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

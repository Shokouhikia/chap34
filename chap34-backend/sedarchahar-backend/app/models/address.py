import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class Address(SQLModel, table=True):
    """A shipping address saved under a verified user, used for print orders."""
    __tablename__ = "addresses"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)

    full_name: str = Field(max_length=100)
    province: str = Field(max_length=50)
    city: str = Field(max_length=50)
    full_address: str
    postal_code: str = Field(max_length=10)
    phone_number: str = Field(max_length=15)

    is_default: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

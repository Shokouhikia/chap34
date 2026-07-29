import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    """
    A user is created the first time a phone number is verified via OTP —
    there is no password. Nothing exists here until checkout.
    """
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    phone_number: str = Field(unique=True, index=True, max_length=15)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: datetime | None = None

import uuid
from datetime import datetime, timedelta
from enum import Enum

from sqlmodel import Field, SQLModel

from app.core.config import settings


class OTPPurpose(str, Enum):
    LOGIN = "login"
    ORDER_VERIFICATION = "order_verification"


class OTPCode(SQLModel, table=True):
    """
    Short-lived verification code sent by SMS. We store a hash of the
    code, never the plain value, and track attempts to block brute-forcing.
    """
    __tablename__ = "otp_codes"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    phone_number: str = Field(index=True, max_length=15)
    code_hash: str

    purpose: OTPPurpose = Field(default=OTPPurpose.ORDER_VERIFICATION)
    attempts: int = Field(default=0)

    expires_at: datetime = Field(
        default_factory=lambda: datetime.utcnow()
        + timedelta(seconds=settings.otp_ttl_seconds)
    )
    verified_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

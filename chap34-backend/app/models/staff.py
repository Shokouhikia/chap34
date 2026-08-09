import uuid
from datetime import datetime
from enum import Enum

from sqlmodel import Field, SQLModel


class StaffRole(str, Enum):
    ADMIN = "admin"
    ATELIER = "atelier"


class StaffAccount(SQLModel, table=True):
    __tablename__ = "staff_accounts"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(max_length=100)
    username: str = Field(unique=True, index=True, max_length=50)
    password_hash: str
    role: StaffRole = Field(index=True)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: datetime | None = None

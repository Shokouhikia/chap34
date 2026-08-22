import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
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
    # Atelier-only. None/empty = unrestricted (sees every province) - keeps
    # existing accounts working unchanged unless an admin opts them into a
    # restricted list. Admin role is never restricted regardless of this field.
    provinces: list[str] | None = Field(default=None, sa_column=Column(JSONB))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: datetime | None = None

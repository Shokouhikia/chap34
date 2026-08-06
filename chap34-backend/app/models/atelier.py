import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class Atelier(SQLModel, table=True):
    """
    A contracted atelier that consumes (never edits) finished orders:
    logs into its own panel, watches its assigned orders move through the
    print/ship lifecycle, and can print sheets / register shipment info.
    Created only by the system admin (BRD 5.1 #1); ateliers cannot
    self-register.
    """
    __tablename__ = "ateliers"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    name: str = Field(max_length=100)
    username: str = Field(unique=True, index=True, max_length=50)
    password_hash: str

    is_active: bool = Field(default=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: datetime | None = None

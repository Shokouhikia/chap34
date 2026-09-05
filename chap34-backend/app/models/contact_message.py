import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class ContactMessage(SQLModel, table=True):
    """A submission from the public /contact form."""
    __tablename__ = "contact_messages"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(max_length=100)
    phone: str = Field(max_length=20)
    email: str | None = Field(default=None, max_length=200)
    subject: str = Field(max_length=200)
    message: str

    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

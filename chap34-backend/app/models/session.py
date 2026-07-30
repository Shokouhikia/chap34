import uuid
from datetime import datetime, timedelta

from sqlmodel import Field, SQLModel

from app.core.config import settings


class AnonymousSession(SQLModel, table=True):
    """
    Lets a visitor upload and process a photo before we know who they are.
    Photos are attached to this session until the user verifies their
    phone number at checkout, at which point they're re-attached to a User.
    """
    __tablename__ = "anonymous_sessions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    token: str = Field(unique=True, index=True, max_length=64)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(
        default_factory=lambda: datetime.utcnow()
        + timedelta(hours=settings.anonymous_session_ttl_hours)
    )

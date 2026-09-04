import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class Redirect(SQLModel, table=True):
    __tablename__ = "redirects"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # Path only (e.g. "/old-page"), no scheme/host - matched against the
    # incoming request path by the frontend middleware.
    source_path: str = Field(index=True, unique=True, max_length=500)
    destination_path: str = Field(max_length=500)
    status_code: int = Field(default=301)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

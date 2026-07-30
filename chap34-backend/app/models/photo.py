import uuid
from datetime import datetime
from enum import Enum

from sqlmodel import Field, SQLModel
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB


class PhotoStatus(str, Enum):
    PENDING = "pending"           # uploaded, nothing done yet
    DETECTING = "detecting"        # gender detection running
    DETECTED = "detected"          # gender detected, waiting for user settings
    GENERATING = "generating"      # final AI generation (outfit + background) running
    COMPLETED = "completed"        # final result ready
    FAILED = "failed"


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"


class Photo(SQLModel, table=True):
    """
    A single photo through its AI pipeline:
    upload -> detect-gender -> (user picks outfit/background) -> generate -> result.

    Belongs to an anonymous session until the user verifies their phone
    number, then user_id is filled in. The original upload stays valid for
    the whole lifetime of the photo so the user can go back to
    genderSettings and re-generate with different settings without
    re-uploading.
    """
    __tablename__ = "photos"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    session_id: uuid.UUID | None = Field(default=None, foreign_key="anonymous_sessions.id")
    user_id: uuid.UUID | None = Field(default=None, foreign_key="users.id", index=True)

    original_file_url: str
    result_file_url: str | None = None

    status: PhotoStatus = Field(default=PhotoStatus.PENDING)

    # Filled in by /detect-gender - a default suggestion, not final.
    detected_gender: Gender | None = None
    detection_confidence: float | None = None

    # Filled in by the user on the genderSettings screen, sent to /generate.
    selected_gender: Gender | None = None
    outfit_type: str | None = Field(default=None, max_length=50)
    background_color: str | None = Field(default=None, max_length=30)

    # Free-form AI pipeline output/debug info.
    ai_meta: dict | None = Field(default=None, sa_column=Column(JSONB))

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

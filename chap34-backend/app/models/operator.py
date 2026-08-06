import uuid
from datetime import datetime
from enum import Enum

from sqlmodel import Field, SQLModel


class OperatorRole(str, Enum):
    """
    DEMO NOTE: BRD open question 5.9/#3 asks whether different operator
    roles (print vs packing, etc.) are needed. Not decided yet, so this
    field exists but every endpoint currently accepts any active operator
    regardless of role - it's a placeholder for future permission checks.
    """
    OPERATOR = "operator"
    ADMIN = "admin"


class Operator(SQLModel, table=True):
    """A print-house staff account for the operations panel."""
    __tablename__ = "operators"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    name: str = Field(max_length=100)
    username: str = Field(unique=True, index=True, max_length=50)
    password_hash: str
    role: OperatorRole = Field(default=OperatorRole.OPERATOR)

    is_active: bool = Field(default=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: datetime | None = None

import uuid
from datetime import datetime
from enum import Enum

from sqlmodel import Field, SQLModel

from app.models.order import SheetSize


class PrintBatchStatus(str, Enum):
    QUEUED = "queued"
    PRINTING = "printing"
    PRINTED = "printed"


class PrintBatch(SQLModel, table=True):
    """
    A group of `registered` orders an operator batches together to print on
    one run of physical sheets. Orders point back here via Order.batch_id;
    the batch's lifecycle (queued -> printing -> printed) drives the
    fulfillment_status of all its member orders in lock-step.
    """
    __tablename__ = "print_batches"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    # Human-readable code the operator sees on screen / on the sheets, e.g. BATCH-0001.
    code: str = Field(unique=True, index=True, max_length=20)

    sheet_size: SheetSize
    status: PrintBatchStatus = Field(default=PrintBatchStatus.QUEUED, index=True)

    operator_id: uuid.UUID = Field(foreign_key="operators.id", index=True)

    order_count: int = Field(default=0)
    piece_count: int = Field(default=0)
    # Filled in once the sheet layout has been computed for this batch.
    sheet_count: int | None = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

"""
Print-batch lifecycle + sheet generation (BRD 5.4 #5-8).

DEMO NOTE: `mark-printed` moves the batch's orders straight to `qc_pending`
(not just `printed`), so QC has a queue to work from without an extra manual
click. The `printed` status still exists as the transient state a batch is in
between "start printing" and "mark printed"; individual orders skip it in a
single step. This is the small UI-flow decision the spec left to us (2.8).
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlmodel import Session, select

from app.api.deps import get_current_operator
from app.core.database import get_session
from app.models.operator import Operator
from app.models.order import FulfillmentStatus, Order
from app.models.print_batch import PrintBatch, PrintBatchStatus
from app.services import fulfillment
from app.services.rendering import render_output
from app.services.serializers import order_summary
from app.services.sheet_layout import build_sheets

router = APIRouter(prefix="/api/ops", tags=["ops-batches"])


def _batch_orders(db: Session, batch_id: uuid.UUID) -> list[Order]:
    return db.exec(select(Order).where(Order.batch_id == batch_id)).all()


def _get_batch(db: Session, batch_id: uuid.UUID) -> PrintBatch:
    batch = db.get(PrintBatch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="بچ یافت نشد")
    return batch


@router.get("/batches")
def list_batches(
    db: Session = Depends(get_session),
    _: Operator = Depends(get_current_operator),
):
    batches = db.exec(select(PrintBatch).order_by(PrintBatch.created_at.desc())).all()
    return [
        {
            "id": str(b.id),
            "code": b.code,
            "sheet_size": b.sheet_size.value,
            "status": b.status.value,
            "order_count": b.order_count,
            "piece_count": b.piece_count,
            "sheet_count": b.sheet_count,
            "created_at": b.created_at.isoformat(),
        }
        for b in batches
    ]


@router.get("/batches/{batch_id}")
def get_batch(
    batch_id: uuid.UUID,
    db: Session = Depends(get_session),
    _: Operator = Depends(get_current_operator),
):
    batch = _get_batch(db, batch_id)
    orders = _batch_orders(db, batch.id)
    return {
        "id": str(batch.id),
        "code": batch.code,
        "sheet_size": batch.sheet_size.value,
        "status": batch.status.value,
        "order_count": batch.order_count,
        "piece_count": batch.piece_count,
        "sheet_count": batch.sheet_count,
        "orders": [order_summary(db, o) for o in orders],
    }


def _set_batch_and_orders(
    db: Session,
    batch: PrintBatch,
    batch_status: PrintBatchStatus,
    order_status: FulfillmentStatus,
) -> None:
    batch.status = batch_status
    db.add(batch)
    for order in _batch_orders(db, batch.id):
        order.fulfillment_status = order_status
        order.updated_at = datetime.utcnow()
        db.add(order)
    db.commit()


@router.post("/batches/{batch_id}/start-printing")
def start_printing(
    batch_id: uuid.UUID,
    db: Session = Depends(get_session),
    _: Operator = Depends(get_current_operator),
):
    batch = _get_batch(db, batch_id)
    if batch.status != PrintBatchStatus.QUEUED:
        raise HTTPException(status_code=400, detail="فقط بچ‌های در صف قابل شروع چاپ هستند")
    _set_batch_and_orders(db, batch, PrintBatchStatus.PRINTING, FulfillmentStatus.PRINTING)
    return {"ok": True, "status": batch.status.value}


@router.post("/batches/{batch_id}/mark-printed")
def mark_printed(
    batch_id: uuid.UUID,
    db: Session = Depends(get_session),
    _: Operator = Depends(get_current_operator),
):
    batch = _get_batch(db, batch_id)
    if batch.status != PrintBatchStatus.PRINTING:
        raise HTTPException(status_code=400, detail="فقط بچ در حال چاپ قابل اتمام است")
    # Orders go straight to qc_pending so QC has a queue (see module docstring).
    _set_batch_and_orders(db, batch, PrintBatchStatus.PRINTED, FulfillmentStatus.QC_PENDING)
    return {"ok": True, "status": batch.status.value}


@router.get("/batches/{batch_id}/sheets")
def batch_sheets(
    batch_id: uuid.UUID,
    db: Session = Depends(get_session),
    _: Operator = Depends(get_current_operator),
    format: str = Query(default="pdf"),
):
    batch = _get_batch(db, batch_id)
    orders = _batch_orders(db, batch.id)
    if not orders:
        raise HTTPException(status_code=400, detail="این بچ سفارشی ندارد")

    sheet_orders = fulfillment.build_sheet_orders(db, orders)
    images = build_sheets(sheet_orders, batch.sheet_size)

    # Record how many physical sheets this batch turned out to be.
    batch.sheet_count = len(images)
    db.add(batch)
    db.commit()

    payload, media_type = render_output(images, format)
    ext = "pdf" if media_type == "application/pdf" else "png"
    return Response(
        content=payload,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{batch.code}.{ext}"'},
    )

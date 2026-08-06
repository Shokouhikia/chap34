"""
Human-readable sequential codes (ORD-000123, BATCH-0001, SHIP-0001).

DEMO NOTE: these count existing rows and add one. That's fine for the demo
(single-writer, low volume) but is racy under real concurrency - a proper
implementation would use a DB sequence. The unique constraint on each code
column is the backstop if two ever collide.
"""
from sqlmodel import Session, func, select

from app.models.order import Order
from app.models.print_batch import PrintBatch
from app.models.shipment import Shipment


def _next_index(db: Session, model, column) -> int:
    count = db.exec(select(func.count()).select_from(model)).one()
    # func.count() may come back as a scalar or a 1-tuple depending on driver.
    if isinstance(count, tuple):
        count = count[0]
    return int(count) + 1


def next_order_code(db: Session) -> str:
    return f"ORD-{_next_index(db, Order, Order.id):06d}"


def next_batch_code(db: Session) -> str:
    return f"BATCH-{_next_index(db, PrintBatch, PrintBatch.id):04d}"


def next_shipment_code(db: Session) -> str:
    return f"SHIP-{_next_index(db, Shipment, Shipment.id):04d}"

"""
Shipments stage (BRD 5.8): group `packed` orders into a shipment, print the
post-delivery manifest and the postal labels, hand the shipment to the post,
register per-order tracking codes and finally mark orders delivered.
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.deps import require_staff_role
from app.core.database import get_session
from app.models.staff import StaffRole
from app.models.order import FulfillmentStatus, Order
from app.models.shipment import Shipment
from app.services import fulfillment
from app.services.codes import next_shipment_code
from app.services.labels import (
    render_labels_pdf_pages,
    render_post_delivery_list,
    render_shipping_label,
)
from app.services.rendering import render_output
from app.services.serializers import order_summary

router = APIRouter(prefix="/api/ops", tags=["ops-shipments"])


def _shipment_orders(db: Session, shipment_id: uuid.UUID) -> list[Order]:
    return db.exec(select(Order).where(Order.shipment_id == shipment_id)).all()


def _get_shipment(db: Session, shipment_id: uuid.UUID) -> Shipment:
    shipment = db.get(Shipment, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="محموله یافت نشد")
    return shipment


def _pdf_response(payload: bytes, media_type: str, filename: str) -> Response:
    return Response(
        content=payload,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.get("/shipments/packable")
def packable(
    db: Session = Depends(get_session),
    _=Depends(require_staff_role(StaffRole.ATELIER)),
):
    orders = db.exec(
        select(Order).where(
            Order.fulfillment_status == FulfillmentStatus.PACKED,
            Order.shipment_id == None,  # noqa: E711
        )
    ).all()
    return {"total": len(orders), "orders": [order_summary(db, o) for o in orders]}


class CreateShipmentBody(BaseModel):
    order_ids: list[uuid.UUID]


@router.post("/shipments")
def create_shipment(
    body: CreateShipmentBody,
    db: Session = Depends(get_session),
    staff=Depends(require_staff_role(StaffRole.ATELIER)),
):
    if not body.order_ids:
        raise HTTPException(status_code=400, detail="حداقل یک سفارش را انتخاب کنید")

    orders: list[Order] = []
    for oid in body.order_ids:
        order = db.get(Order, oid)
        if not order:
            raise HTTPException(status_code=404, detail=f"سفارش {oid} یافت نشد")
        if order.fulfillment_status != FulfillmentStatus.PACKED:
            raise HTTPException(
                status_code=400,
                detail=f"سفارش {order.order_code} بسته‌بندی‌شده نیست",
            )
        orders.append(order)

    shipment = Shipment(
        code=next_shipment_code(db),
        staff_id=staff.id,
        order_count=len(orders),
    )
    db.add(shipment)
    db.commit()
    db.refresh(shipment)

    for order in orders:
        order.shipment_id = shipment.id
        order.fulfillment_status = FulfillmentStatus.READY_TO_SHIP
        order.updated_at = datetime.utcnow()
        db.add(order)
    db.commit()

    return {"id": str(shipment.id), "code": shipment.code, "order_count": shipment.order_count}


@router.get("/shipments")
def list_shipments(
    db: Session = Depends(get_session),
    _=Depends(require_staff_role(StaffRole.ATELIER)),
):
    shipments = db.exec(select(Shipment).order_by(Shipment.created_at.desc())).all()
    return [
        {
            "id": str(s.id),
            "code": s.code,
            "order_count": s.order_count,
            "handed_to_post_at": s.handed_to_post_at.isoformat() if s.handed_to_post_at else None,
            "created_at": s.created_at.isoformat(),
        }
        for s in shipments
    ]


@router.get("/shipments/{shipment_id}")
def get_shipment(
    shipment_id: uuid.UUID,
    db: Session = Depends(get_session),
    _=Depends(require_staff_role(StaffRole.ATELIER)),
):
    shipment = _get_shipment(db, shipment_id)
    orders = _shipment_orders(db, shipment.id)
    return {
        "id": str(shipment.id),
        "code": shipment.code,
        "order_count": shipment.order_count,
        "handed_to_post_at": shipment.handed_to_post_at.isoformat()
        if shipment.handed_to_post_at
        else None,
        "orders": [order_summary(db, o) for o in orders],
    }


@router.get("/shipments/{shipment_id}/post-delivery-list")
def post_delivery_list(
    shipment_id: uuid.UUID,
    db: Session = Depends(get_session),
    _=Depends(require_staff_role(StaffRole.ATELIER)),
    format: str = Query(default="pdf"),
):
    shipment = _get_shipment(db, shipment_id)
    orders = _shipment_orders(db, shipment.id)
    rows = [fulfillment.build_label_data(db, o) for o in orders]
    images = render_post_delivery_list(shipment.code, rows)
    payload, media_type = render_output(images, format)
    ext = "pdf" if media_type == "application/pdf" else "png"
    return _pdf_response(payload, media_type, f"{shipment.code}-post-list.{ext}")


@router.get("/shipments/{shipment_id}/labels")
def shipment_labels(
    shipment_id: uuid.UUID,
    db: Session = Depends(get_session),
    _=Depends(require_staff_role(StaffRole.ATELIER)),
    format: str = Query(default="pdf"),
):
    shipment = _get_shipment(db, shipment_id)
    orders = _shipment_orders(db, shipment.id)
    if not orders:
        raise HTTPException(status_code=400, detail="این محموله سفارشی ندارد")
    labels = [fulfillment.build_label_data(db, o) for o in orders]
    images = render_labels_pdf_pages(labels)
    payload, media_type = render_output(images, format)
    ext = "pdf" if media_type == "application/pdf" else "png"
    return _pdf_response(payload, media_type, f"{shipment.code}-labels.{ext}")


@router.post("/shipments/{shipment_id}/hand-to-post")
def hand_to_post(
    shipment_id: uuid.UUID,
    db: Session = Depends(get_session),
    _=Depends(require_staff_role(StaffRole.ATELIER)),
):
    shipment = _get_shipment(db, shipment_id)
    shipment.handed_to_post_at = datetime.utcnow()
    db.add(shipment)
    for order in _shipment_orders(db, shipment.id):
        order.fulfillment_status = FulfillmentStatus.HANDED_TO_POST
        order.updated_at = datetime.utcnow()
        db.add(order)
    db.commit()
    return {"ok": True, "handed_to_post_at": shipment.handed_to_post_at.isoformat()}


class TrackingBody(BaseModel):
    tracking_code: str


@router.post("/orders/{order_id}/tracking-code")
def set_tracking_code(
    order_id: uuid.UUID,
    body: TrackingBody,
    db: Session = Depends(get_session),
    _=Depends(require_staff_role(StaffRole.ATELIER)),
):
    order = fulfillment.get_order_or_404(db, order_id)
    order = fulfillment.register_tracking_and_ship(db, order, body.tracking_code)
    return order_summary(db, order)


@router.post("/orders/{order_id}/mark-delivered")
def mark_delivered(
    order_id: uuid.UUID,
    db: Session = Depends(get_session),
    _=Depends(require_staff_role(StaffRole.ATELIER)),
):
    order = fulfillment.get_order_or_404(db, order_id)
    order.fulfillment_status = FulfillmentStatus.DELIVERED
    order.delivered_at = datetime.utcnow()
    order.updated_at = datetime.utcnow()
    db.add(order)
    db.commit()
    return order_summary(db, order)


@router.get("/orders/{order_id}/shipping-label")
def order_shipping_label(
    order_id: uuid.UUID,
    db: Session = Depends(get_session),
    _=Depends(require_staff_role(StaffRole.ATELIER)),
    format: str = Query(default="pdf"),
):
    order = fulfillment.get_order_or_404(db, order_id)
    label = render_shipping_label(fulfillment.build_label_data(db, order))
    payload, media_type = render_output([label], format)
    ext = "pdf" if media_type == "application/pdf" else "png"
    return _pdf_response(payload, media_type, f"{order.order_code}-label.{ext}")

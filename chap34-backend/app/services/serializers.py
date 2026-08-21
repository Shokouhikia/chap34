"""
Shared JSON shapes for orders, so the atelier and operations panels return
consistent fields (and the coarse atelier stage is computed in exactly one
place).
"""
from __future__ import annotations

from sqlmodel import Session

from app.models.order import Order
from app.services.fulfillment import customer_name_for
from app.services.status_mapping import to_atelier_stage


def photo_url_for(db: Session, order: Order) -> str | None:
    """The order's finished photo URL, for thumbnails in the panel grids so
    staff can eyeball which person an order belongs to. None when the photo
    row or its generated result is missing (e.g. seeded demo orders)."""
    from app.models.photo import Photo  # local import mirrors fulfillment.py

    photo = db.get(Photo, order.photo_id)
    return photo.result_file_url if photo else None


def batch_code_for(db: Session, order: Order) -> str | None:
    """The human-readable batch code (e.g. BATCH-0001) an order was printed
    under, for the report - so staff can trace a customer's photo back to
    the physical print run without opening the batch screen separately."""
    if not order.batch_id:
        return None
    from app.models.print_batch import PrintBatch  # local import mirrors fulfillment.py

    batch = db.get(PrintBatch, order.batch_id)
    return batch.code if batch else None


def order_summary(db: Session, order: Order) -> dict:
    return {
        "id": str(order.id),
        "order_code": order.order_code,
        "customer_name": customer_name_for(db, order),
        "photo_url": photo_url_for(db, order),
        "quantity": order.quantity,
        "size": order.size.value,
        "paper_type": order.paper_type.value,
        "fulfillment_status": order.fulfillment_status.value,
        "atelier_stage": to_atelier_stage(order.fulfillment_status),
        "tracking_code": order.tracking_code,
        "batch_id": str(order.batch_id) if order.batch_id else None,
        "batch_code": batch_code_for(db, order),
        "shipment_id": str(order.shipment_id) if order.shipment_id else None,
        "created_at": order.created_at.isoformat(),
    }


def order_detail(db: Session, order: Order) -> dict:
    from app.models.address import Address

    data = order_summary(db, order)
    address = db.get(Address, order.address_id)
    data.update(
        {
            "total_price": order.total_price,
            "packing_checklist": order.packing_checklist,
            "shipped_at": order.shipped_at.isoformat() if order.shipped_at else None,
            "delivered_at": order.delivered_at.isoformat() if order.delivered_at else None,
            "address": {
                "full_name": address.full_name,
                "province": address.province,
                "city": address.city,
                "full_address": address.full_address,
                "postal_code": address.postal_code,
                "phone": address.phone_number,
            }
            if address
            else None,
        }
    )
    return data

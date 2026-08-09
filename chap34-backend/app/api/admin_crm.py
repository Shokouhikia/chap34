import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select, func

from app.api.deps import require_staff_role
from app.core.database import get_session
from app.models.address import Address
from app.models.order import Order, OrderStatus, OrderStatusHistory
from app.models.photo import Photo
from app.models.staff import StaffAccount, StaffRole
from app.models.user import User

router = APIRouter(prefix="/api/admin", tags=["admin-crm"])
require_admin = require_staff_role(StaffRole.ADMIN)


@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_session), _staff: StaffAccount = Depends(require_admin)):
    total_orders = db.exec(select(func.count()).select_from(Order)).one()
    total_customers = db.exec(select(func.count()).select_from(User)).one()
    total_photos = db.exec(select(func.count()).select_from(Photo)).one()

    paid_orders = db.exec(select(Order).where(Order.status != OrderStatus.CREATED)).all()
    total_revenue = sum(o.total_price for o in paid_orders)

    by_status = {}
    for status in OrderStatus:
        count = db.exec(select(func.count()).select_from(Order).where(Order.status == status)).one()
        by_status[status.value] = count

    return {
        "total_orders": total_orders,
        "total_customers": total_customers,
        "total_photos": total_photos,
        "total_revenue": total_revenue,
        "orders_by_status": by_status,
    }


def _order_summary(db: Session, order: Order) -> dict:
    user = db.get(User, order.user_id)
    return {
        "id": order.id,
        "user_id": order.user_id,
        "user_phone": user.phone_number if user else None,
        "quantity": order.quantity,
        "size": order.size.value,
        "paper_type": order.paper_type.value,
        "total_price": order.total_price,
        "discount_code": order.discount_code,
        "discount_amount": order.discount_amount,
        "status": order.status,
        "tracking_code": order.tracking_code,
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat(),
    }


@router.get("/orders")
def list_all_orders(
    status: str | None = None,
    db: Session = Depends(get_session),
    _staff: StaffAccount = Depends(require_admin),
):
    query = select(Order).order_by(Order.created_at.desc())
    if status and status != "all":
        try:
            wanted = OrderStatus(status)
            query = query.where(Order.status == wanted)
        except ValueError:
            raise HTTPException(status_code=400, detail="وضعیت نامعتبر است")
    orders = db.exec(query).all()
    return [_order_summary(db, o) for o in orders]


@router.get("/orders/{order_id}")
def get_order_detail(order_id: uuid.UUID, db: Session = Depends(get_session), _staff: StaffAccount = Depends(require_admin)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="سفارش یافت نشد")

    address = db.get(Address, order.address_id) if order.address_id else None
    history = db.exec(
        select(OrderStatusHistory).where(OrderStatusHistory.order_id == order.id).order_by(OrderStatusHistory.created_at)
    ).all()

    return {
        "order": _order_summary(db, order),
        "address": address,
        "history": history,
    }


class OrderStatusUpdate(BaseModel):
    status: str
    note: str | None = None
    tracking_code: str | None = None


@router.patch("/orders/{order_id}/status")
def update_order_status(
    order_id: uuid.UUID, body: OrderStatusUpdate,
    db: Session = Depends(get_session), _staff: StaffAccount = Depends(require_admin),
):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="سفارش یافت نشد")

    try:
        new_status = OrderStatus(body.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="وضعیت نامعتبر است")

    order.status = new_status
    if body.tracking_code is not None:
        order.tracking_code = body.tracking_code
    db.add(order)
    db.add(OrderStatusHistory(order_id=order.id, status=new_status, note=body.note))
    db.commit()
    db.refresh(order)
    return _order_summary(db, order)


@router.get("/customers")
def list_customers(db: Session = Depends(get_session), _staff: StaffAccount = Depends(require_admin)):
    users = db.exec(select(User).order_by(User.created_at.desc())).all()
    out = []
    for u in users:
        order_count = db.exec(select(func.count()).select_from(Order).where(Order.user_id == u.id)).one()
        out.append({
            "id": u.id, "phone_number": u.phone_number,
            "created_at": u.created_at.isoformat(), "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            "order_count": order_count,
        })
    return out

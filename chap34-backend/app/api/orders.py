"""
Order + payment endpoints.

DEMO NOTE: payment is faked - `/api/payment/init` returns a fake gateway
URL instead of a real Zarinpal/IDPay redirect, and `/api/payment/callback`
is called directly by the frontend instead of by a real gateway webhook.
`/api/orders/{id}/advance` is a demo-only convenience endpoint that lets
the frontend "fast forward" a paid order through its tracking timeline,
so the tracking screen has something to show without a real print
partner. Everything else (address handling, price computation) is real
logic - only the external SMS/AI/payment calls are stubbed.
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.core.database import get_session
from app.core.pricing import get_price, get_shipping_cost
from app.models.address import Address
from app.models.discount import DiscountCode
from app.models.order import Order, OrderStatus, OrderStatusHistory, PaperType, PrintSize
from app.models.payment import Payment, PaymentGateway, PaymentStatus
from app.models.photo import Photo
from app.models.print_job import PrintJob
from app.models.user import User
from app.services.codes import next_order_code

router = APIRouter(prefix="/api", tags=["orders"])

STATUS_SEQUENCE = [
    OrderStatus.CREATED,
    OrderStatus.PAID,
    OrderStatus.PREPARING,
    OrderStatus.PRINTED,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
]


class AddressIn(BaseModel):
    full_name: str
    province: str
    city: str
    full_address: str
    postal_code: str
    phone: str


class OrderCreate(BaseModel):
    photo_id: uuid.UUID  # must be the *final* generated photo, not the raw upload
    size: PrintSize
    quantity: int
    paper_type: PaperType
    address: AddressIn
    discount_code: str | None = None


def _log_status(db: Session, order: Order, status: OrderStatus, note: str | None = None):
    order.status = status
    db.add(order)
    db.add(OrderStatusHistory(order_id=order.id, status=status, note=note))
    db.commit()
    db.refresh(order)


@router.post("/orders")
def create_order(
    body: OrderCreate,
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    try:
        print_amount = get_price(db, body.size, body.paper_type, body.quantity)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    discount_amount = 0
    discount_percent = None
    normalized_discount_code = None
    if body.discount_code:
        normalized_discount_code = body.discount_code.strip().upper()
        code_row = db.exec(select(DiscountCode).where(DiscountCode.code == normalized_discount_code)).first()
        if not code_row or not code_row.active:
            raise HTTPException(status_code=400, detail="کد تخفیف نامعتبر یا غیرفعال است")
        discount_percent = code_row.percent
        discount_amount = round(print_amount * discount_percent / 100)
        print_amount = print_amount - discount_amount

    shipping_cost = get_shipping_cost(db)
    amount = print_amount + shipping_cost

    address = Address(
        user_id=user.id,
        full_name=body.address.full_name,
        province=body.address.province,
        city=body.address.city,
        full_address=body.address.full_address,
        postal_code=body.address.postal_code,
        phone_number=body.address.phone,
    )
    db.add(address)
    db.commit()
    db.refresh(address)

    # The summary page calls this endpoint both on load (to get a price quote)
    # and again every time the discount code is (re)applied. Without this
    # check, each of those calls minted a brand-new unpaid Order row - a
    # customer clicking "apply" a few times ended up with several orphaned
    # `created` orders and only the last one ever got paid. Reusing the most
    # recent still-unpaid order for this user+photo makes repeated calls
    # idempotent instead of multiplying rows.
    existing = db.exec(
        select(Order)
        .where(
            Order.user_id == user.id,
            Order.photo_id == body.photo_id,
            Order.status == OrderStatus.CREATED,
        )
        .order_by(Order.created_at.desc())
    ).first()

    if existing:
        existing.address_id = address.id
        existing.size = body.size
        existing.paper_type = body.paper_type
        existing.quantity = body.quantity
        existing.total_price = amount
        existing.discount_code = normalized_discount_code
        existing.discount_percent = discount_percent
        existing.discount_amount = discount_amount
        existing.updated_at = datetime.utcnow()
        db.add(existing)
        db.commit()
        db.refresh(existing)
        order = existing
    else:
        order = Order(
            user_id=user.id,
            photo_id=body.photo_id,
            address_id=address.id,
            size=body.size,
            paper_type=body.paper_type,
            quantity=body.quantity,
            total_price=amount,
            discount_code=normalized_discount_code,
            discount_percent=discount_percent,
            discount_amount=discount_amount,
            order_code=next_order_code(db),
        )
        db.add(order)
        db.commit()
        db.refresh(order)
        db.add(OrderStatusHistory(order_id=order.id, status=OrderStatus.CREATED))
        db.commit()

    return {
        "order_id": order.id,
        "amount_due": amount,
        "print_amount": print_amount + discount_amount,
        "shipping_cost": shipping_cost,
        "discount_amount": discount_amount,
        "discount_code": normalized_discount_code,
        "discount_percent": discount_percent,
    }


@router.post("/payment/init")
def init_payment(
    order_id: uuid.UUID,
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    order = db.get(Order, order_id)
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="سفارش یافت نشد")

    payment = Payment(
        order_id=order.id,
        gateway=PaymentGateway.ZARINPAL,
        authority=f"DEMO-{uuid.uuid4().hex[:10]}",
        amount=order.total_price,
        status=PaymentStatus.PENDING,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    # DEMO: a real integration would redirect the user to the gateway's
    # real URL; here we just hand back a fake one the frontend can "follow".
    return {
        "payment_id": payment.id,
        "gateway_redirect_url": f"/fake-gateway?authority={payment.authority}",
    }


@router.post("/payment/callback")
def payment_callback(
    payment_id: uuid.UUID,
    db: Session = Depends(get_session),
):
    """DEMO: stands in for the gateway's real server-to-server webhook.
    The frontend calls this directly to simulate a successful payment."""
    payment = db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="پرداخت یافت نشد")

    payment.status = PaymentStatus.SUCCESS
    payment.ref_id = f"DEMO-REF-{uuid.uuid4().hex[:8]}"
    db.add(payment)
    db.commit()

    order = db.get(Order, payment.order_id)
    _log_status(db, order, OrderStatus.PAID, note="پرداخت دمو با موفقیت انجام شد")
    db.add(PrintJob(order_id=order.id, printer_partner="چاپخانه دمو"))
    db.commit()

    return {"order_id": order.id, "status": order.status}


@router.post("/orders/{order_id}/advance")
def advance_status(
    order_id: uuid.UUID,
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """DEMO ONLY: pushes the order to its next timeline status so the
    tracking screen can be demoed without a real print/ship cycle."""
    order = db.get(Order, order_id)
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="سفارش یافت نشد")

    current_index = STATUS_SEQUENCE.index(order.status)
    if current_index >= len(STATUS_SEQUENCE) - 1:
        return order

    _log_status(db, order, STATUS_SEQUENCE[current_index + 1])
    return order


@router.get("/orders/{order_id}/status")
def get_order_status(
    order_id: uuid.UUID,
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    order = db.get(Order, order_id)
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="سفارش یافت نشد")

    history = db.exec(
        select(OrderStatusHistory)
        .where(OrderStatusHistory.order_id == order.id)
        .order_by(OrderStatusHistory.created_at)
    ).all()

    return {"order": order, "history": history}


@router.get("/orders")
def list_my_orders(
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Backs the "سفارش‌های من" tab in the customer account panel."""
    orders = db.exec(
        select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc())
    ).all()

    result = []
    for order in orders:
        address = db.get(Address, order.address_id)
        photo = db.get(Photo, order.photo_id)
        result.append(
            {
                "id": order.id,
                "order_code": order.order_code,
                "status": order.status,
                "size": order.size,
                "paper_type": order.paper_type,
                "quantity": order.quantity,
                "total_price": order.total_price,
                "tracking_code": order.tracking_code,
                "created_at": order.created_at,
                "photo_url": photo.result_file_url if photo else None,
                "address": (
                    {
                        "full_name": address.full_name,
                        "province": address.province,
                        "city": address.city,
                        "full_address": address.full_address,
                        "postal_code": address.postal_code,
                        "phone": address.phone_number,
                    }
                    if address
                    else None
                ),
            }
        )
    return result

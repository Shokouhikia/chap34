"""
Order + payment endpoints.

Payment goes through the real Zarinpal gateway (app.services.zarinpal):
`/api/payment/init` requests an authority from Zarinpal and returns its
real StartPay redirect URL, and `/api/payment/verify` is called by the
frontend's /checkout/payment-callback page (where Zarinpal redirects the
customer's browser back to) to verify the payment server-to-server before
marking the order paid. Address handling and price computation are real
logic; only SMS (order confirmation) is best-effort/no-op until the admin
configures an SMS provider in Settings.
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, func, select

from app.api.deps import get_current_user
from app.core.database import get_session
from app.core.pricing import get_price, get_shipping_cost
from app.models.address import Address
from app.models.discount import DiscountCode
from app.models.order import Order, OrderStatus, OrderStatusHistory, PaperType, PrintSize
from app.models.payment import Payment, PaymentGateway, PaymentStatus
from app.models.photo import Photo
from app.models.print_job import PrintJob
from app.models.setting import KEY_BASE_URL
from app.models.user import User
from app.services import notifications, settings_service, zarinpal
from app.services.codes import next_order_code

router = APIRouter(prefix="/api", tags=["orders"])


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
        if code_row.max_uses_per_user is not None:
            prior_uses = db.exec(
                select(func.count())
                .select_from(Order)
                .where(
                    Order.discount_code == normalized_discount_code,
                    Order.user_id == user.id,
                    Order.status != OrderStatus.CANCELLED,
                )
            ).one()
            if prior_uses >= code_row.max_uses_per_user:
                raise HTTPException(
                    status_code=400,
                    detail=f"این کد تخفیف حداکثر {code_row.max_uses_per_user} بار برای هر کاربر قابل استفاده است و قبلاً به این تعداد استفاده شده",
                )
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

    if not zarinpal.is_configured(db):
        raise HTTPException(
            status_code=503,
            detail="درگاه پرداخت هنوز توسط مدیر سایت پیکربندی نشده است",
        )

    base_url = (settings_service.get_value(db, KEY_BASE_URL) or "").rstrip("/")
    if not base_url:
        raise HTTPException(
            status_code=503,
            detail="Base URL سایت در تنظیمات وارد نشده؛ بدون آن درگاه پرداخت نمی‌تواند کاربر را بازگرداند",
        )

    address = db.get(Address, order.address_id)
    callback_url = f"{base_url}/checkout/payment-callback?order_id={order.id}"

    try:
        authority, redirect_url = zarinpal.request_payment(
            db,
            amount_toman=order.total_price,
            description=f"سفارش چاپ عکس پرسنلی {order.order_code}",
            callback_url=callback_url,
            mobile=address.phone_number if address else None,
        )
    except zarinpal.ZarinpalError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    payment = Payment(
        order_id=order.id,
        gateway=PaymentGateway.ZARINPAL,
        authority=authority,
        amount=order.total_price,
        status=PaymentStatus.PENDING,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    return {"payment_id": payment.id, "gateway_redirect_url": redirect_url}


@router.get("/payment/verify")
def verify_payment(
    order_id: uuid.UUID,
    Authority: str,
    Status: str,
    db: Session = Depends(get_session),
):
    """
    Called by the frontend's /checkout/payment-callback page, which is
    where Zarinpal redirects the customer's browser back to with these
    same query params after they pay (or cancel) on the gateway's own site.
    """
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="سفارش یافت نشد")

    payment = db.exec(
        select(Payment)
        .where(Payment.order_id == order.id, Payment.authority == Authority)
        .order_by(Payment.created_at.desc())
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="پرداخت یافت نشد")

    if Status != "OK":
        payment.status = PaymentStatus.FAILED
        db.add(payment)
        db.commit()
        return {"order_id": order.id, "status": order.status, "payment_status": "failed"}

    try:
        success, ref_id = zarinpal.verify_payment(db, amount_toman=payment.amount, authority=Authority)
    except zarinpal.ZarinpalError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    if not success:
        payment.status = PaymentStatus.FAILED
        db.add(payment)
        db.commit()
        return {"order_id": order.id, "status": order.status, "payment_status": "failed"}

    payment.status = PaymentStatus.SUCCESS
    payment.ref_id = ref_id
    payment.paid_at = datetime.utcnow()
    db.add(payment)
    db.commit()

    _log_status(db, order, OrderStatus.PAID, note=f"پرداخت زرین‌پال تأیید شد (ref_id={ref_id})")
    db.add(PrintJob(order_id=order.id, printer_partner="چاپخانه چاپ۳۴"))
    db.commit()

    address = db.get(Address, order.address_id)
    if address:
        notifications.send_order_confirmation(db, order, address)

    return {"order_id": order.id, "status": order.status, "payment_status": "success"}


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

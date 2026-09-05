"""
Order notification SMS. SMS only: the checkout flow never collects a
customer email (User only has a phone number - see app.models.user), so
there is no address to send an order-confirmation *email* to.
app.services.email_service exists and is used for the contact-form
business-owner notification instead.

Each notification type has its own on/off toggle in Settings
(KEY_SMSIR_NOTIFY_*), independent of which SMS provider is active -
see app.services.sms_service for the actual provider dispatch.
"""
from sqlmodel import Session

from app.models.address import Address
from app.models.order import Order
from app.models.setting import (
    KEY_BASE_URL,
    KEY_SMSIR_NOTIFY_PAYMENT_CONFIRMED,
    KEY_SMSIR_NOTIFY_STATUS_CHANGE,
)
from app.services import settings_service, sms_service


def _tracking_hint(db: Session) -> str:
    base_url = (settings_service.get_value(db, KEY_BASE_URL) or "").rstrip("/")
    return f"{base_url}/track-order" if base_url else "صفحه‌ی پیگیری سفارش سایت"


def send_order_confirmation(db: Session, order: Order, address: Address) -> None:
    if settings_service.get_value(db, KEY_SMSIR_NOTIFY_PAYMENT_CONFIRMED) != "true":
        return
    text = (
        f"چاپ۳۴: سفارش شما با کد {order.order_code} ثبت و پرداخت آن با موفقیت انجام شد. "
        f"مبلغ پرداختی: {order.total_price:,} تومان. "
        f"پیگیری: {_tracking_hint(db)}"
    )
    sms_service.send_sms(db, address.phone_number, text)


def send_status_change_sms(db: Session, order: Order, address: Address, status_text: str) -> None:
    """status_text is a short Persian phrase describing what happened,
    e.g. "ارسال شد" or "تحویل داده شد" - callers own the exact wording
    since it depends on which real fulfillment event fired."""
    if settings_service.get_value(db, KEY_SMSIR_NOTIFY_STATUS_CHANGE) != "true":
        return
    extra = f" کد رهگیری: {order.tracking_code}" if order.tracking_code else ""
    text = (
        f"چاپ۳۴: سفارش شما با کد {order.order_code} {status_text}.{extra} "
        f"پیگیری: {_tracking_hint(db)}"
    )
    sms_service.send_sms(db, address.phone_number, text)

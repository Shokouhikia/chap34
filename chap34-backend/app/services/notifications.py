"""
Order-confirmation notification, sent once a payment is verified.

SMS only: the checkout flow never collects a customer email (User only has
a phone number - see app.models.user), so there is no address to send an
order-confirmation *email* to. app.services.email_service exists and is
used for the contact-form business-owner notification instead; wiring a
customer confirmation email would require adding an email field to
checkout, which is a product decision, not made here.
"""
from sqlmodel import Session

from app.models.address import Address
from app.models.order import Order
from app.models.setting import KEY_BASE_URL
from app.services import settings_service, sms_service


def send_order_confirmation(db: Session, order: Order, address: Address) -> None:
    base_url = (settings_service.get_value(db, KEY_BASE_URL) or "").rstrip("/")
    tracking_hint = f"{base_url}/track-order" if base_url else "صفحه‌ی پیگیری سفارش سایت"
    text = (
        f"چاپ۳۴: سفارش شما با کد {order.order_code} ثبت و پرداخت آن با موفقیت انجام شد. "
        f"مبلغ پرداختی: {order.total_price:,} تومان. "
        f"پیگیری: {tracking_hint}"
    )
    sms_service.send_sms(db, address.phone_number, text)

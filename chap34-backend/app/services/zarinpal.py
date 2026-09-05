"""
Real Zarinpal Payment Gateway integration (REST API v4), replacing the old
fake `/fake-gateway` flow. Docs: https://docs.zarinpal.com/paymentGateway/

Zarinpal amounts are in Rial; the rest of this app (pricing, Order.total_price)
works in Toman, so every amount crossing this module is multiplied by 10.

Requires `zarinpal_merchant_id` to be set in admin settings - callers must
check `is_configured()` first and fail with a clear error otherwise; this
module never falls back to a fake/demo response.
"""
import httpx
from sqlmodel import Session

from app.models.setting import KEY_ZARINPAL_MERCHANT_ID
from app.services import settings_service

REQUEST_URL = "https://api.zarinpal.com/pg/v4/payment/request.json"
VERIFY_URL = "https://api.zarinpal.com/pg/v4/payment/verify.json"
STARTPAY_URL = "https://www.zarinpal.com/pg/StartPay/{authority}"


class ZarinpalError(Exception):
    pass


def is_configured(db: Session) -> bool:
    return bool(settings_service.get_value(db, KEY_ZARINPAL_MERCHANT_ID))


def _merchant_id(db: Session) -> str:
    merchant_id = settings_service.get_value(db, KEY_ZARINPAL_MERCHANT_ID)
    if not merchant_id:
        raise ZarinpalError("درگاه پرداخت هنوز پیکربندی نشده است (merchant_id زرین‌پال خالی است)")
    return merchant_id


def request_payment(db: Session, amount_toman: int, description: str, callback_url: str, mobile: str | None = None) -> str:
    """Returns the redirect URL the customer's browser should be sent to."""
    payload = {
        "merchant_id": _merchant_id(db),
        "amount": amount_toman * 10,
        "description": description,
        "callback_url": callback_url,
    }
    if mobile:
        payload["metadata"] = {"mobile": mobile}

    try:
        resp = httpx.post(REQUEST_URL, json=payload, timeout=15)
        resp.raise_for_status()
        body = resp.json()
    except httpx.HTTPError as exc:
        raise ZarinpalError(f"ارتباط با درگاه پرداخت برقرار نشد: {exc}") from exc

    data = body.get("data") or {}
    if data.get("code") != 100:
        errors = body.get("errors") or data
        raise ZarinpalError(f"درخواست پرداخت رد شد: {errors}")

    authority = data["authority"]
    return authority, STARTPAY_URL.format(authority=authority)


def verify_payment(db: Session, amount_toman: int, authority: str) -> tuple[bool, str | None]:
    """Returns (success, ref_id)."""
    payload = {
        "merchant_id": _merchant_id(db),
        "amount": amount_toman * 10,
        "authority": authority,
    }
    try:
        resp = httpx.post(VERIFY_URL, json=payload, timeout=15)
        resp.raise_for_status()
        body = resp.json()
    except httpx.HTTPError as exc:
        raise ZarinpalError(f"ارتباط با درگاه پرداخت برقرار نشد: {exc}") from exc

    data = body.get("data") or {}
    code = data.get("code")
    # 100 = freshly verified, 101 = already verified earlier (still a success).
    if code in (100, 101):
        return True, data.get("ref_id")
    return False, None

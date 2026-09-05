"""
Provider-agnostic SMS entry point, used by every part of the app that
sends a text message (OTP login, order confirmation, status-change
notifications, contact-form). Dispatches to SMS.ir (app.services.smsir_service)
when enabled in Settings; otherwise falls back to the older Kavenegar
"simple send" call below, which is kept working (not removed) as a
fallback rather than deleted, per the migration note when SMS.ir was
added. Never raises - every path returns False on failure so a
notification problem can't break the order/payment flow it's attached to.
"""
import httpx
from sqlmodel import Session

from app.models.setting import KEY_SMS_API_KEY, KEY_SMS_PROVIDER
from app.services import settings_service, smsir_service

KAVENEGAR_SEND_URL = "https://api.kavenegar.com/v1/{api_key}/sms/send.json"


def _send_via_kavenegar(db: Session, phone: str, text: str) -> bool:
    provider = settings_service.get_value(db, KEY_SMS_PROVIDER) or "kavenegar"
    api_key = settings_service.get_value(db, KEY_SMS_API_KEY)
    if not api_key or provider != "kavenegar":
        return False
    try:
        resp = httpx.post(
            KAVENEGAR_SEND_URL.format(api_key=api_key),
            data={"receptor": phone, "message": text},
            timeout=10,
        )
        return resp.status_code == 200
    except httpx.HTTPError:
        return False


def send_sms(db: Session, phone: str, text: str) -> bool:
    if smsir_service.is_enabled(db):
        return smsir_service.send_sms(db, phone, text)
    return _send_via_kavenegar(db, phone, text)


def send_otp_code(db: Session, phone: str, code: str) -> bool:
    """OTP-specific send: uses SMS.ir's templated Verify endpoint when a
    template id is configured (falls back to plain text via send_sms
    otherwise, e.g. before the account's template is approved)."""
    if smsir_service.is_enabled(db):
        if smsir_service.send_otp_via_template(db, phone, code):
            return True
        return smsir_service.send_sms(db, phone, f"کد ورود شما به چاپ۳۴: {code}")
    return _send_via_kavenegar(db, phone, f"کد ورود شما به چاپ۳۴: {code}")

"""
Real SMS sending via Kavenegar's simple send API, gated on the admin having
configured `sms_api_key` in Settings. Returns False (never raises) when not
configured or the provider call fails - callers use this for best-effort
notifications (e.g. order confirmation) that must never block the
request/response they're attached to.
"""
import httpx
from sqlmodel import Session

from app.models.setting import KEY_SMS_API_KEY, KEY_SMS_PROVIDER
from app.services import settings_service

KAVENEGAR_SEND_URL = "https://api.kavenegar.com/v1/{api_key}/sms/send.json"


def send_sms(db: Session, phone: str, text: str) -> bool:
    provider = settings_service.get_value(db, KEY_SMS_PROVIDER) or "kavenegar"
    api_key = settings_service.get_value(db, KEY_SMS_API_KEY)
    if not api_key:
        return False

    if provider == "kavenegar":
        try:
            resp = httpx.post(
                KAVENEGAR_SEND_URL.format(api_key=api_key),
                data={"receptor": phone, "message": text},
                timeout=10,
            )
            return resp.status_code == 200
        except httpx.HTTPError:
            return False

    # Other providers (e.g. Ghasedak) aren't implemented yet.
    return False

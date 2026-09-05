"""
Real integration with SMS.ir's REST API v1 (https://apidocs.sms.ir/,
https://sms.ir/rest-api/, https://sms.ir/web-service/ - fetched directly,
not guessed):

    Base URL: https://api.sms.ir
    Auth:     header `x-api-key: <API_KEY>`, plus `Content-Type: application/json`

    POST /v1/send/bulk    - plain text SMS to one or more numbers
        body: {lineNumber, messageText, mobiles: [...], sendDateTime?}
    POST /v1/send/verify  - templated SMS (used for OTP), requires an
                            SMS.ir "Verify"/"UltraFast" template approved
                            on the account
        body: {mobile, templateId, parameters: [{name, value}, ...]}
    GET  /v1/credit       - remaining account credit (decimal)

NOTE ON RESPONSE ENVELOPE: SMS.ir's own docs pages describe the request
shapes above but apidocs.sms.ir (their OpenAPI reference, which would give
the exact success/error status codes) has an expired TLS certificate as of
this writing and could not be fetched to confirm the precise `status` code
that means success. This module treats an HTTP 200 as delivery-accepted
(the field always present regardless of that detail) and additionally
checks a `status` field for the commonly-used convention (1 = success)
where the response includes one - never crashes the caller either way.
Once a real API key is in place, run this module's send_sms() once and
compare against apidocs.sms.ir (retry the docs site - the cert may be
fixed by then) to confirm/adjust the success check if needed.
"""
import httpx
from sqlmodel import Session

from app.models.setting import (
    KEY_SMSIR_API_KEY,
    KEY_SMSIR_ENABLED,
    KEY_SMSIR_LINE_NUMBER,
    KEY_SMSIR_OTP_TEMPLATE_ID,
)
from app.services import settings_service

BASE_URL = "https://api.sms.ir"


def is_enabled(db: Session) -> bool:
    return settings_service.get_value(db, KEY_SMSIR_ENABLED) == "true" and bool(
        settings_service.get_value(db, KEY_SMSIR_API_KEY)
    )


def _headers(db: Session) -> dict:
    return {
        "x-api-key": settings_service.get_value(db, KEY_SMSIR_API_KEY),
        "Content-Type": "application/json",
        "Accept": "text/plain",
    }


def _looks_successful(resp: httpx.Response) -> bool:
    if resp.status_code != 200:
        return False
    try:
        body = resp.json()
    except ValueError:
        return True
    if isinstance(body, dict) and "status" in body:
        return body["status"] == 1
    return True


def send_sms(db: Session, mobile: str, text: str) -> bool:
    """Plain text SMS via /v1/send/bulk. Never raises - returns False on
    any failure (missing config, network error, provider rejection)."""
    if not is_enabled(db):
        return False

    line_number = settings_service.get_value(db, KEY_SMSIR_LINE_NUMBER)
    payload = {
        "lineNumber": int(line_number) if line_number else None,
        "messageText": text,
        "mobiles": [mobile],
    }
    try:
        resp = httpx.post(f"{BASE_URL}/v1/send/bulk", json=payload, headers=_headers(db), timeout=10)
        return _looks_successful(resp)
    except httpx.HTTPError:
        return False


def send_otp_via_template(db: Session, mobile: str, code: str) -> bool:
    """Templated OTP via /v1/send/verify - requires an approved template
    on the SMS.ir account whose first parameter is the code. Returns False
    (never raises) if no template is configured or the call fails, so
    callers can fall back to a plain-text send."""
    template_id = settings_service.get_value(db, KEY_SMSIR_OTP_TEMPLATE_ID)
    if not is_enabled(db) or not template_id:
        return False

    payload = {
        "mobile": mobile,
        "templateId": int(template_id),
        "parameters": [{"name": "CODE", "value": code}],
    }
    try:
        resp = httpx.post(f"{BASE_URL}/v1/send/verify", json=payload, headers=_headers(db), timeout=10)
        return _looks_successful(resp)
    except httpx.HTTPError:
        return False


def get_credit(db: Session) -> float | None:
    """Remaining account credit via GET /v1/credit, for display in the
    admin panel. Returns None if not configured or the call fails."""
    if not is_enabled(db):
        return None
    try:
        resp = httpx.get(f"{BASE_URL}/v1/credit", headers=_headers(db), timeout=10)
        if resp.status_code != 200:
            return None
        body = resp.json()
        if isinstance(body, dict) and "data" in body:
            return float(body["data"])
        return float(body)
    except (httpx.HTTPError, ValueError, TypeError):
        return None

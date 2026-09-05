"""
Manual smoke test for the SMS.ir integration - run this after entering a
real API key (and, for the OTP test, a real approved template id) in
/panel/admin/business-info's "پیامک و ایمیل" tab.

Usage (from chap34-backend/, with the same DATABASE_URL as the running app
so it reads the same Settings row):

    python -m scripts.test_smsir 09xxxxxxxxx

Prints the account credit, then sends one plain-text SMS and (if a
template id is configured) one templated OTP SMS to the given number.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlmodel import Session  # noqa: E402

from app.core.database import engine  # noqa: E402
from app.services import smsir_service  # noqa: E402


def main():
    if len(sys.argv) != 2:
        print("Usage: python scripts/test_smsir.py 09xxxxxxxxx")
        sys.exit(1)
    mobile = sys.argv[1]

    with Session(engine) as db:
        if not smsir_service.is_enabled(db):
            print("SMS.ir is not enabled/configured - set it up in /panel/admin/business-info first.")
            sys.exit(1)

        credit = smsir_service.get_credit(db)
        print(f"Account credit: {credit}")

        print("Sending plain-text SMS via /v1/send/bulk ...")
        ok = smsir_service.send_sms(db, mobile, "پیامک آزمایشی از چاپ۳۴ - سرویس SMS.ir با موفقیت متصل شد.")
        print("  ->", "OK" if ok else "FAILED")

        print("Sending templated OTP via /v1/send/verify ...")
        ok = smsir_service.send_otp_via_template(db, mobile, "1234")
        print("  ->", "OK" if ok else "FAILED (no template id configured, or the call failed)")


if __name__ == "__main__":
    main()

"""
Real OTP login: a random 4-digit code is generated, bcrypt-hashed (never
stored in plain text) and sent via the configured SMS provider
(app.services.sms_service). In production, if no SMS provider is
configured (or sending fails), send-otp fails closed with a 503 instead of
falling back to a fixed code - a publicly-known fixed OTP is an account
takeover vector by phone number alone, and looks exactly like one during a
security review. Non-production environments fall back to returning the
code directly in the response so the flow stays testable without a real
SMS account.
"""
import random
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.core.config import settings as app_settings
from app.core.database import get_session
from app.core.security import create_customer_token, hash_password, verify_password
from app.models.otp import OTPCode, OTPPurpose
from app.models.photo import Photo
from app.models.user import User
from app.services import sms_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _generate_code() -> str:
    return f"{random.randint(0, 9999):04d}"


class SendOtpBody(BaseModel):
    phone: str


class VerifyOtpBody(BaseModel):
    phone: str
    code: str
    session_token: str | None = None  # so we can attach anonymous photos to the user


@router.post("/send-otp")
def send_otp(body: SendOtpBody, db: Session = Depends(get_session)):
    code = _generate_code()
    otp = OTPCode(
        phone_number=body.phone,
        code_hash=hash_password(code),
        purpose=OTPPurpose.LOGIN,
    )
    db.add(otp)
    db.commit()

    sent = sms_service.send_otp_code(db, body.phone, code)

    if sent:
        return {"message": "کد تأیید ارسال شد"}

    if app_settings.environment == "production":
        raise HTTPException(status_code=503, detail="سرویس پیامک هنوز توسط مدیر سایت پیکربندی نشده است")

    return {"message": "کد تأیید ارسال شد", "dev_hint": f"پیامک ارسال نشد (سرویس پیامک تنظیم نشده) - کد: {code}"}


@router.post("/verify-otp")
def verify_otp(body: VerifyOtpBody, db: Session = Depends(get_session)):
    otp = db.exec(
        select(OTPCode)
        .where(OTPCode.phone_number == body.phone, OTPCode.verified_at.is_(None))
        .order_by(OTPCode.created_at.desc())
    ).first()

    if not otp or otp.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="کد تأیید منقضی شده است؛ دوباره درخواست دهید")

    if otp.attempts >= app_settings.otp_max_attempts:
        raise HTTPException(status_code=400, detail="تعداد تلاش مجاز به پایان رسیده؛ دوباره درخواست دهید")

    if not verify_password(body.code, otp.code_hash):
        otp.attempts += 1
        db.add(otp)
        db.commit()
        raise HTTPException(status_code=400, detail="کد تأیید اشتباه است")

    otp.verified_at = datetime.utcnow()
    db.add(otp)
    db.commit()

    user = db.exec(select(User).where(User.phone_number == body.phone)).first()
    if not user:
        user = User(phone_number=body.phone)
        db.add(user)
        db.commit()
        db.refresh(user)

    # Attach any photos created under the anonymous session to this user now.
    if body.session_token:
        from app.models.session import AnonymousSession

        anon_session = db.exec(
            select(AnonymousSession).where(AnonymousSession.token == body.session_token)
        ).first()
        if anon_session:
            photos = db.exec(
                select(Photo).where(Photo.session_id == anon_session.id)
            ).all()
            for photo in photos:
                photo.user_id = user.id
                db.add(photo)
            db.commit()

    return {
        "token": create_customer_token(user.id),
        "user_id": user.id,
        "phone": user.phone_number,
    }

"""
DEMO NOTE: OTP is completely fake here - no SMS is sent and the code is
always "1234". This is only so the frontend flow (enter phone -> enter
code -> logged in) can be demoed end to end. Replace with a real SMS
provider (Kavenegar/Ghasedak) before launch. The access token itself is a
real signed JWT (see create_customer_token).
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import create_customer_token
from app.models.otp import OTPCode, OTPPurpose
from app.models.photo import Photo
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])

FAKE_OTP_CODE = "1234"


class SendOtpBody(BaseModel):
    phone: str


class VerifyOtpBody(BaseModel):
    phone: str
    code: str
    session_token: str | None = None  # so we can attach anonymous photos to the user


@router.post("/send-otp")
def send_otp(body: SendOtpBody, db: Session = Depends(get_session)):
    otp = OTPCode(
        phone_number=body.phone,
        code_hash=FAKE_OTP_CODE,  # demo only: never store plain codes in real life
        purpose=OTPPurpose.ORDER_VERIFICATION,
    )
    db.add(otp)
    db.commit()

    # In production this is where we'd call the SMS provider API.
    return {"message": "کد تأیید ارسال شد", "demo_hint": f"کد دمو: {FAKE_OTP_CODE}"}


@router.post("/verify-otp")
def verify_otp(body: VerifyOtpBody, db: Session = Depends(get_session)):
    if body.code != FAKE_OTP_CODE:
        raise HTTPException(status_code=400, detail="کد تأیید اشتباه است")

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

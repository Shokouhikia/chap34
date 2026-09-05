"""
Public, unauthenticated endpoints for the static/legal pages, the contact
form, and no-login order tracking. Business-info here is always the
PUBLIC_CONTENT_KEYS subset of Setting - SMTP/payment credentials live in
the same table but are never exposed through this router.
"""
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.core.database import get_session
from app.models.address import Address
from app.models.contact_message import ContactMessage
from app.models.order import Order, OrderStatusHistory
from app.models.setting import KEY_BIZ_EMAIL, PUBLIC_CONTENT_KEYS
from app.services import email_service, settings_service

router = APIRouter(prefix="/api/content", tags=["content"])


@router.get("/business-info")
def business_info(db: Session = Depends(get_session)):
    raw = settings_service.get_all(db)
    return {key: raw.get(key, "") for key in PUBLIC_CONTENT_KEYS}


class ContactIn(BaseModel):
    name: str
    phone: str
    email: str | None = None
    subject: str
    message: str


@router.post("/contact")
def submit_contact(body: ContactIn, db: Session = Depends(get_session)):
    if not body.name.strip() or not body.phone.strip() or not body.message.strip():
        raise HTTPException(status_code=400, detail="نام، شماره تماس و متن پیام الزامی است")

    row = ContactMessage(
        name=body.name.strip()[:100],
        phone=body.phone.strip()[:20],
        email=(body.email or "").strip()[:200] or None,
        subject=body.subject.strip()[:200] or "بدون موضوع",
        message=body.message.strip(),
    )
    db.add(row)
    db.commit()

    business_email = settings_service.get_value(db, KEY_BIZ_EMAIL)
    if business_email:
        email_service.send_email(
            db,
            business_email,
            f"پیام جدید از فرم تماس: {row.subject}",
            f"نام: {row.name}\nتلفن: {row.phone}\nایمیل: {row.email or '-'}\n\n{row.message}",
        )

    return {"ok": True}


def _normalize_phone(phone: str) -> str:
    return re.sub(r"\D", "", phone or "")


@router.get("/track-order")
def track_order(order_code: str, phone: str, db: Session = Depends(get_session)):
    order = db.exec(select(Order).where(Order.order_code == order_code.strip().upper())).first()
    if not order:
        raise HTTPException(status_code=404, detail="سفارشی با این شماره یافت نشد")

    address = db.get(Address, order.address_id)
    if not address or _normalize_phone(address.phone_number) != _normalize_phone(phone):
        raise HTTPException(status_code=404, detail="سفارشی با این شماره یافت نشد")

    history = db.exec(
        select(OrderStatusHistory)
        .where(OrderStatusHistory.order_id == order.id)
        .order_by(OrderStatusHistory.created_at)
    ).all()

    return {
        "order_code": order.order_code,
        "status": order.status,
        "size": order.size,
        "paper_type": order.paper_type,
        "quantity": order.quantity,
        "tracking_code": order.tracking_code,
        "created_at": order.created_at,
        "history": [{"status": h.status, "created_at": h.created_at} for h in history],
    }

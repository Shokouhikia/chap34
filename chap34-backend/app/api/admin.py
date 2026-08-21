from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, func, select

from app.api.deps import require_staff_role
from app.core.database import get_session
from app.core.security import hash_password
from app.models.discount import DiscountCode
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.models.setting import (
    KEY_AI_PROVIDER,
    KEY_BASE_URL,
    KEY_GOOGLE_AI_API_KEY,
    KEY_OPENROUTER_API_KEY,
    KEY_OPENROUTER_MODEL,
    KEY_PAPER_MULTIPLIER_GLOSSY,
    KEY_PAPER_MULTIPLIER_MATTE,
    KEY_PRICE_BASE_QTY_12,
    KEY_PRICE_BASE_QTY_24,
    KEY_PRICE_BASE_QTY_6,
    KEY_SHIPPING_COST,
    KEY_SIZE_MULTIPLIER_3X4,
    KEY_SIZE_MULTIPLIER_6X8,
    KEY_SMS_API_KEY,
    KEY_SMS_PASSWORD,
    KEY_SMS_PROVIDER,
    KEY_SMS_USERNAME,
    KEY_ZARINPAL_MERCHANT_ID,
    OPENROUTER_MODEL_CHOICES,
    SECRET_KEYS,
)
from app.models.staff import StaffAccount, StaffRole
from app.services import settings_service

router = APIRouter(prefix="/api/admin", tags=["admin"])
require_admin = require_staff_role(StaffRole.ADMIN)


@router.get("/settings")
def get_settings(db: Session = Depends(get_session), _staff: StaffAccount = Depends(require_admin)):
    raw = settings_service.get_all(db)
    out = {}
    for key, value in raw.items():
        if key in SECRET_KEYS:
            out[key] = settings_service.mask(value)
            out[f"_has_{key}"] = bool(value)
        else:
            out[key] = value
    return {
        "settings": out,
        # Single source of truth for the model dropdown in the admin UI -
        # keeps the curated OpenRouter model list defined only in
        # app.models.setting.
        "openrouter_model_choices": OPENROUTER_MODEL_CHOICES,
    }


class SettingsUpdate(BaseModel):
    sms_provider: str | None = None
    sms_api_key: str | None = None
    sms_username: str | None = None
    sms_password: str | None = None
    google_ai_api_key: str | None = None
    zarinpal_merchant_id: str | None = None
    base_url: str | None = None
    price_base_qty_6: str | None = None
    price_base_qty_12: str | None = None
    price_base_qty_24: str | None = None
    size_multiplier_3x4: str | None = None
    size_multiplier_6x8: str | None = None
    paper_multiplier_glossy: str | None = None
    paper_multiplier_matte: str | None = None
    shipping_cost: str | None = None
    ai_provider: str | None = None
    openrouter_api_key: str | None = None
    openrouter_model: str | None = None


@router.put("/settings")
def update_settings(body: SettingsUpdate, db: Session = Depends(get_session), _staff: StaffAccount = Depends(require_admin)):
    settings_service.set_values(db, {
        KEY_SMS_PROVIDER: body.sms_provider or "",
        KEY_SMS_API_KEY: body.sms_api_key or "",
        KEY_SMS_USERNAME: body.sms_username or "",
        KEY_SMS_PASSWORD: body.sms_password or "",
        KEY_GOOGLE_AI_API_KEY: body.google_ai_api_key or "",
        KEY_ZARINPAL_MERCHANT_ID: body.zarinpal_merchant_id or "",
        KEY_BASE_URL: body.base_url or "",
        KEY_PRICE_BASE_QTY_6: body.price_base_qty_6 or "",
        KEY_PRICE_BASE_QTY_12: body.price_base_qty_12 or "",
        KEY_PRICE_BASE_QTY_24: body.price_base_qty_24 or "",
        KEY_SIZE_MULTIPLIER_3X4: body.size_multiplier_3x4 or "",
        KEY_SIZE_MULTIPLIER_6X8: body.size_multiplier_6x8 or "",
        KEY_PAPER_MULTIPLIER_GLOSSY: body.paper_multiplier_glossy or "",
        KEY_PAPER_MULTIPLIER_MATTE: body.paper_multiplier_matte or "",
        KEY_SHIPPING_COST: body.shipping_cost or "",
        KEY_AI_PROVIDER: body.ai_provider or "",
        KEY_OPENROUTER_API_KEY: body.openrouter_api_key or "",
        KEY_OPENROUTER_MODEL: body.openrouter_model or "",
    })
    return {"ok": True}


@router.get("/atelier-accounts")
def list_atelier_accounts(db: Session = Depends(get_session), _staff: StaffAccount = Depends(require_admin)):
    rows = db.exec(select(StaffAccount).where(StaffAccount.role == StaffRole.ATELIER)).all()
    return [{"id": r.id, "username": r.username, "name": r.name, "is_active": r.is_active, "created_at": r.created_at} for r in rows]


class CreateAtelierAccount(BaseModel):
    name: str
    username: str
    password: str


@router.post("/atelier-accounts")
def create_atelier_account(body: CreateAtelierAccount, db: Session = Depends(get_session), _staff: StaffAccount = Depends(require_admin)):
    username = body.username.strip()
    existing = db.exec(
        select(StaffAccount).where(func.lower(StaffAccount.username) == username.lower())
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="این نام کاربری قبلاً استفاده شده")
    account = StaffAccount(name=body.name.strip(), username=username, password_hash=hash_password(body.password), role=StaffRole.ATELIER)
    db.add(account)
    db.commit()
    db.refresh(account)
    return {"id": account.id, "username": account.username, "name": account.name}


@router.delete("/atelier-accounts/{account_id}")
def deactivate_atelier_account(account_id: str, db: Session = Depends(get_session), _staff: StaffAccount = Depends(require_admin)):
    account = db.get(StaffAccount, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="حساب یافت نشد")
    account.is_active = False
    db.add(account)
    db.commit()
    return {"ok": True}


class UpdateAtelierAccount(BaseModel):
    name: str | None = None
    username: str | None = None
    password: str | None = None
    is_active: bool | None = None


@router.patch("/atelier-accounts/{account_id}")
def update_atelier_account(
    account_id: str,
    body: UpdateAtelierAccount,
    db: Session = Depends(get_session),
    _staff: StaffAccount = Depends(require_admin),
):
    account = db.get(StaffAccount, account_id)
    if not account or account.role != StaffRole.ATELIER:
        raise HTTPException(status_code=404, detail="حساب یافت نشد")

    if body.username and body.username.strip().lower() != account.username.lower():
        new_username = body.username.strip()
        existing = db.exec(
            select(StaffAccount).where(func.lower(StaffAccount.username) == new_username.lower())
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="این نام کاربری قبلاً استفاده شده")
        account.username = new_username

    if body.name:
        account.name = body.name.strip()
    if body.password:
        account.password_hash = hash_password(body.password)
    if body.is_active is not None:
        account.is_active = body.is_active

    db.add(account)
    db.commit()
    db.refresh(account)
    return {"id": account.id, "username": account.username, "name": account.name, "is_active": account.is_active}


# ---- discount codes ----

@router.get("/discount-codes")
def list_discount_codes(db: Session = Depends(get_session), _staff: StaffAccount = Depends(require_admin)):
    rows = db.exec(select(DiscountCode).order_by(DiscountCode.created_at.desc())).all()
    out = []
    for row in rows:
        # CANCELLED orders are excluded - those are mostly the leftover
        # duplicate rows the summary page used to create on every discount
        # re-apply (see orders.py create_order), not real redemptions.
        uses = db.exec(
            select(Order).where(
                Order.discount_code == row.code, Order.status != OrderStatus.CANCELLED
            )
        ).all()
        out.append({**row.model_dump(), "usage_count": len(uses)})
    return out


@router.get("/discount-codes/{code_id}/usage")
def discount_code_usage(
    code_id: str, db: Session = Depends(get_session), _staff: StaffAccount = Depends(require_admin)
):
    """Per-user redemption breakdown for one discount code."""
    row = db.get(DiscountCode, code_id)
    if not row:
        raise HTTPException(status_code=404, detail="کد یافت نشد")

    orders = db.exec(
        select(Order).where(
            Order.discount_code == row.code, Order.status != OrderStatus.CANCELLED
        )
    ).all()

    by_user: dict[str, dict] = {}
    for order in orders:
        user = db.get(User, order.user_id)
        phone = user.phone_number if user else str(order.user_id)
        entry = by_user.setdefault(phone, {"phone": phone, "count": 0})
        entry["count"] += 1

    return {
        "code": row.code,
        "total_uses": len(orders),
        "by_user": sorted(by_user.values(), key=lambda e: -e["count"]),
    }


class CreateDiscountCode(BaseModel):
    code: str
    percent: int


@router.post("/discount-codes")
def create_discount_code(body: CreateDiscountCode, db: Session = Depends(get_session), _staff: StaffAccount = Depends(require_admin)):
    if not (1 <= body.percent <= 100):
        raise HTTPException(status_code=400, detail="درصد تخفیف باید بین ۱ تا ۱۰۰ باشد")
    code = body.code.strip().upper()
    existing = db.exec(select(DiscountCode).where(DiscountCode.code == code)).first()
    if existing:
        raise HTTPException(status_code=400, detail="این کد تخفیف قبلاً ساخته شده")
    row = DiscountCode(code=code, percent=body.percent, active=True)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/discount-codes/{code_id}/toggle")
def toggle_discount_code(code_id: str, db: Session = Depends(get_session), _staff: StaffAccount = Depends(require_admin)):
    row = db.get(DiscountCode, code_id)
    if not row:
        raise HTTPException(status_code=404, detail="کد یافت نشد")
    row.active = not row.active
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

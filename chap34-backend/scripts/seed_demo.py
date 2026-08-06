"""
Seed demo accounts + a few fulfillment-ready orders so both panels can be
clicked through by hand without going through the whole customer funnel.

Run from the backend root after `alembic upgrade head`:

    python -m scripts.seed_demo

It is idempotent-ish: it skips creating accounts/orders that already exist by
username / order_code, so re-running won't pile up duplicates.
"""
import sys
import uuid
from datetime import datetime
from pathlib import Path

# Allow `python scripts/seed_demo.py` as well as `-m scripts.seed_demo`.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlmodel import Session, select  # noqa: E402

from app.core.database import engine  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.address import Address  # noqa: E402
from app.models.atelier import Atelier  # noqa: E402
from app.models.operator import Operator, OperatorRole  # noqa: E402
from app.models.order import (  # noqa: E402
    FulfillmentStatus,
    Order,
    OrderStatus,
    PaperType,
    PrintSize,
)
from app.models.photo import Photo, PhotoStatus  # noqa: E402
from app.models.user import User  # noqa: E402

DEMO_PASSWORD = "demo1234"


def _get_or_create_atelier(db: Session) -> Atelier:
    existing = db.exec(select(Atelier).where(Atelier.username == "atelier1")).first()
    if existing:
        return existing
    atelier = Atelier(
        name="آتلیه نمونه",
        username="atelier1",
        password_hash=hash_password(DEMO_PASSWORD),
    )
    db.add(atelier)
    db.commit()
    db.refresh(atelier)
    return atelier


def _ensure_operators(db: Session) -> None:
    accounts = [
        ("اپراتور نمونه", "operator1", OperatorRole.OPERATOR),
        ("مدیر سیستم", "admin", OperatorRole.ADMIN),
    ]
    for name, username, role in accounts:
        if db.exec(select(Operator).where(Operator.username == username)).first():
            continue
        db.add(
            Operator(
                name=name,
                username=username,
                password_hash=hash_password(DEMO_PASSWORD),
                role=role,
            )
        )
    db.commit()


def _demo_user_and_photo(db: Session) -> tuple[User, Photo]:
    user = db.exec(select(User).where(User.phone_number == "09120000000")).first()
    if not user:
        user = User(phone_number="09120000000")
        db.add(user)
        db.commit()
        db.refresh(user)

    photo = db.exec(select(Photo).where(Photo.user_id == user.id)).first()
    if not photo:
        photo = Photo(
            user_id=user.id,
            original_file_url="/static/uploads/demo.jpg",
            result_file_url="/static/uploads/demo.jpg",
            status=PhotoStatus.COMPLETED,
        )
        db.add(photo)
        db.commit()
        db.refresh(photo)
    return user, photo


def _seed_orders(db: Session, atelier: Atelier) -> None:
    user, photo = _demo_user_and_photo(db)

    # Spread demo orders across a few stages so every panel screen has data.
    specs = [
        ("ORD-000101", "علی رضایی", 6, FulfillmentStatus.REGISTERED),
        ("ORD-000102", "مریم حسینی", 12, FulfillmentStatus.REGISTERED),
        ("ORD-000103", "رضا کریمی", 24, FulfillmentStatus.REGISTERED),
        ("ORD-000104", "زهرا موسوی", 6, FulfillmentStatus.QC_PENDING),
        ("ORD-000105", "حسین عباسی", 12, FulfillmentStatus.SORTING),
        ("ORD-000106", "فاطمه احمدی", 6, FulfillmentStatus.READY_TO_PACK),
        ("ORD-000107", "نگار سلطانی", 12, FulfillmentStatus.PACKED),
    ]

    for code, full_name, qty, status in specs:
        if db.exec(select(Order).where(Order.order_code == code)).first():
            continue
        address = Address(
            user_id=user.id,
            full_name=full_name,
            province="تهران",
            city="تهران",
            full_address="خیابان نمونه، پلاک ۱۲، واحد ۳",
            postal_code="1234567890",
            phone_number="09120000000",
        )
        db.add(address)
        db.commit()
        db.refresh(address)

        db.add(
            Order(
                user_id=user.id,
                photo_id=photo.id,
                address_id=address.id,
                size=PrintSize.SIZE_3X4,
                paper_type=PaperType.GLOSSY,
                quantity=qty,
                total_price=400_000,
                status=OrderStatus.PAID,
                order_code=code,
                atelier_id=atelier.id,
                fulfillment_status=status,
                created_at=datetime.utcnow(),
            )
        )
        db.commit()


def main() -> None:
    with Session(engine) as db:
        atelier = _get_or_create_atelier(db)
        _ensure_operators(db)
        _seed_orders(db, atelier)

    print("Seed complete.")
    print(f"  atelier login : atelier1 / {DEMO_PASSWORD}")
    print(f"  operator login: operator1 / {DEMO_PASSWORD}")
    print(f"  admin login   : admin / {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()

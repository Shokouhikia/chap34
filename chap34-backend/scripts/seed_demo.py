"""
Seed demo accounts + a few fulfillment-ready orders so both panels can be
clicked through by hand without going through the whole customer funnel.

Run from the backend root after `alembic upgrade head`:

    python -m scripts.seed_demo

It is idempotent-ish: it skips creating accounts/orders that already exist by
username / order_code, so re-running won't pile up duplicates.
"""
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlmodel import Session, select  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.core.database import engine  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.address import Address  # noqa: E402
from app.models.staff import StaffAccount, StaffRole  # noqa: E402
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


def _get_or_create_staff(db: Session) -> StaffAccount:
    existing = db.exec(select(StaffAccount).where(StaffAccount.username == "atelier1")).first()
    if existing:
        return existing
    staff = StaffAccount(
        name="آتلیه نمونه",
        username="atelier1",
        password_hash=hash_password(DEMO_PASSWORD),
        role=StaffRole.ATELIER,
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


def _ensure_staff(db: Session) -> None:
    accounts = [
        ("آتلیه نمونه ۲", "atelier2", StaffRole.ATELIER),
        ("مدیر سیستم", "admin", StaffRole.ADMIN),
    ]
    for name, username, role in accounts:
        if db.exec(select(StaffAccount).where(StaffAccount.username == username)).first():
            continue
        db.add(
            StaffAccount(
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

def _seed_orders(db: Session, staff: StaffAccount) -> None:
    user, photo = _demo_user_and_photo(db)

    specs = [
        ("ORD-000101", "علی رضایی", 6, FulfillmentStatus.REGISTERED),
        ("ORD-000102", "مریم حسینی", 12, FulfillmentStatus.REGISTERED),
        ("ORD-000103", "رضا کریمی", 24, FulfillmentStatus.REGISTERED),
        ("ORD-000104", "زهرا موسوی", 6, FulfillmentStatus.PRINTED),
        ("ORD-000105", "حسین عباسی", 12, FulfillmentStatus.READY_TO_PACK),
        ("ORD-000106", "فاطمه احمدی", 6, FulfillmentStatus.PACKED),
    ]

    for code, full_name, qty, status in specs:
        row = db.execute(
            text("SELECT order_code FROM orders WHERE order_code = :code"),
            {"code": code},
        ).first()
        if row:
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
                fulfillment_status=status,
                created_at=datetime.utcnow(),
            )
        )
        db.commit()


def main() -> None:
    with Session(engine) as db:
        staff = _get_or_create_staff(db)
        _ensure_staff(db)
        _seed_orders(db, staff)
        from app.services import settings_service
        settings_service.ensure_defaults(db)

    print("Seed complete.")
    print(f"  atelier login : atelier1 / {DEMO_PASSWORD}")
    print(f"  admin login   : admin / {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()

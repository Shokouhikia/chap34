from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select

from app.core.config import settings
from app.core.database import engine
from app.core.security import hash_password
from app.models.staff import StaffAccount, StaffRole
from app.services import settings_service

import app.models  # noqa: F401
from app.api import (
    admin,
    admin_crm,
    admin_redirects,
    atelier,
    auth,
    ops_batches,
    ops_dashboard,
    ops_orders,
    ops_packing,
    ops_shipments,
    orders,
    photos,
    pricing,
    seo,
    staff_auth,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    with Session(engine) as db:
        if not db.exec(select(StaffAccount).where(StaffAccount.username == settings.admin_user)).first():
            db.add(
                StaffAccount(
                    name="مدیر سیستم",
                    username=settings.admin_user,
                    password_hash=hash_password(settings.admin_pass),
                    role=StaffRole.ADMIN,
                )
            )
            db.commit()
        settings_service.ensure_defaults(db)
    yield


app = FastAPI(
    title="Chap34 API",
    description="سرویس تولید عکس پرسنلی ۳×۴ با هوش مصنوعی (نسخه دمو)",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

static_dir = Path(__file__).resolve().parent / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

app.include_router(photos.router)
app.include_router(auth.router)
app.include_router(pricing.router)
app.include_router(orders.router)

app.include_router(atelier.router)
app.include_router(staff_auth.router)

app.include_router(admin.router)
app.include_router(admin_crm.router)
app.include_router(admin_redirects.router)
app.include_router(seo.router)

app.include_router(ops_dashboard.router)
app.include_router(ops_orders.router)
app.include_router(ops_batches.router)
app.include_router(ops_packing.router)
app.include_router(ops_shipments.router)


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}

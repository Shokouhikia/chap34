from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Importing app.models registers every table on SQLModel.metadata,
# which Alembic's env.py relies on for autogenerate.
import app.models  # noqa: F401
from app.api import (
    atelier,
    auth,
    ops_auth,
    ops_batches,
    ops_dashboard,
    ops_orders,
    ops_packing,
    ops_qc,
    ops_shipments,
    ops_sorting,
    orders,
    photos,
    pricing,
)

app = FastAPI(
    title="Chap34 API",
    description="سرویس تولید عکس پرسنلی ۳×۴ با هوش مصنوعی (نسخه دمو)",
    version="0.2.0",
)

# DEMO NOTE: wide-open CORS so the local frontend dev server can call this
# API from any port. Lock this down to the real frontend origin before launch.
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

# Atelier panel (BRD 5.2)
app.include_router(atelier.router)

# Operations panel (BRD 5.1, 5.3-5.8) + admin
app.include_router(ops_auth.router)
app.include_router(ops_auth.admin_router)
app.include_router(ops_dashboard.router)
app.include_router(ops_orders.router)
app.include_router(ops_batches.router)
app.include_router(ops_qc.router)
app.include_router(ops_sorting.router)
app.include_router(ops_packing.router)
app.include_router(ops_shipments.router)


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}

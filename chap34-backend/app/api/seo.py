"""
Public, unauthenticated endpoints the frontend reads at request/build time
to build metadata, sitemap.xml, robots.txt and dynamic redirects. Only ever
exposes the PUBLIC_SEO_KEYS subset of Setting - never secrets (SMS/AI/
payment credentials) which live under the same table but are excluded here.
"""
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.core.database import get_session
from app.models.redirect import Redirect
from app.models.setting import PUBLIC_SEO_KEYS
from app.services import settings_service

router = APIRouter(prefix="/api/seo", tags=["seo"])


@router.get("/settings")
def public_seo_settings(db: Session = Depends(get_session)):
    raw = settings_service.get_all(db)
    return {key: raw.get(key, "") for key in PUBLIC_SEO_KEYS}


@router.get("/redirects")
def public_redirects(db: Session = Depends(get_session)):
    rows = db.exec(select(Redirect).where(Redirect.is_active == True)).all()  # noqa: E712
    return {
        "redirects": [
            {
                "source_path": r.source_path,
                "destination_path": r.destination_path,
                "status_code": r.status_code,
            }
            for r in rows
        ]
    }

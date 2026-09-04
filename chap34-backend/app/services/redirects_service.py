from datetime import datetime
from urllib.parse import urlparse

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.redirect import Redirect


def normalize_path(raw: str) -> str:
    """Path-only, leading slash, no trailing slash (except root), no query/hash."""
    if not raw:
        raise HTTPException(status_code=400, detail="مسیر نمی‌تواند خالی باشد")
    parsed = urlparse(raw.strip())
    path = parsed.path or "/"
    if not path.startswith("/"):
        path = "/" + path
    if len(path) > 1 and path.endswith("/"):
        path = path.rstrip("/")
    return path


def validate_and_normalize(source_path: str, destination_path: str, exclude_id=None) -> tuple[str, str]:
    source = normalize_path(source_path)
    destination = normalize_path(destination_path)

    if source == destination:
        raise HTTPException(status_code=400, detail="مقصد نمی‌تواند همان مبدأ باشد")

    return source, destination


def check_duplicate(db: Session, source_path: str, exclude_id=None) -> None:
    stmt = select(Redirect).where(Redirect.source_path == source_path)
    existing = db.exec(stmt).first()
    if existing and existing.id != exclude_id:
        raise HTTPException(status_code=400, detail="ریدایرکتی با همین مبدأ از قبل وجود دارد")


def check_loop_and_chain(db: Session, source_path: str, destination_path: str, exclude_id=None) -> None:
    """
    Reject anything that would create a redirect loop (A->B->A) or a chain
    (A->B where B is itself already a redirect source, or where some other
    redirect already points at `source_path` as its destination and would
    now hop through this one too).
    """
    others = db.exec(select(Redirect)).all()
    others = [r for r in others if r.id != exclude_id and r.is_active]

    by_source = {r.source_path: r.destination_path for r in others}

    # Chain: does the new destination already have its own redirect?
    if destination_path in by_source:
        raise HTTPException(
            status_code=400,
            detail=f"زنجیره ریدایرکت مجاز نیست: مقصد «{destination_path}» خودش مبدأ یک ریدایرکت دیگر است",
        )

    # Loop: walk forward from destination_path and see if we ever land back on source_path.
    seen = {source_path}
    current = destination_path
    while current in by_source:
        if current in seen:
            raise HTTPException(status_code=400, detail="این ریدایرکت باعث ایجاد یک حلقه (loop) می‌شود")
        seen.add(current)
        current = by_source[current]

    # Someone else already redirects *to* source_path -> adding source_path
    # as a new source would turn that existing redirect into a 2-hop chain.
    for r in others:
        if r.destination_path == source_path:
            raise HTTPException(
                status_code=400,
                detail=f"زنجیره ریدایرکت مجاز نیست: «{r.source_path}» در حال حاضر به «{source_path}» ریدایرکت می‌شود",
            )


def touch(redirect: Redirect) -> None:
    redirect.updated_at = datetime.utcnow()

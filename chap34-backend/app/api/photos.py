"""
Photo pipeline endpoints: upload -> detect-gender -> generate -> result.

Face detection and gender detection run client-side in the browser now
(see chap34-frontend/lib/photoPreprocess.ts) before the photo is ever
uploaded, so `upload_photo` accepts an optional client-detected gender and
`detect_gender` just confirms/echoes it back — it only falls back to a
male default if the client couldn't supply one (JS blocked/failed).

`generate_photo` replaces the background via the admin-configured AI
provider/model (see app.services.photo_generation - OpenRouter, e.g. Google
"Nano Banana", is the default; OpenAI is a selectable fallback) and crops
the result to an exact 3:4 headshot. `outfit_type` is NOT yet applied to
the pixels — swapping actual garments needs a generative model, which is
future work; the requested value is stored in `ai_meta` so the UI keeps
working end-to-end.
"""
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.deps import get_current_user, get_or_create_anonymous_session
from app.core.database import get_session
from app.models.photo import Gender, Photo, PhotoStatus
from app.models.session import AnonymousSession
from app.models.user import User
from app.services.photo_generation import PhotoGenerationError, generate_id_photo

router = APIRouter(prefix="/api/photo", tags=["photo"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "static" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
def upload_photo(
    file: UploadFile = File(...),
    client_gender: str | None = Form(None),
    client_gender_confidence: float | None = Form(None),
    db: Session = Depends(get_session),
    anon_session: AnonymousSession = Depends(get_or_create_anonymous_session),
):
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="فرمت عکس پشتیبانی نمی‌شود")

    ext = Path(file.filename or "photo.jpg").suffix or ".jpg"
    saved_name = f"{uuid.uuid4().hex}{ext}"
    saved_path = UPLOAD_DIR / saved_name

    with saved_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    detected_gender = None
    if client_gender in (Gender.MALE.value, Gender.FEMALE.value):
        detected_gender = Gender(client_gender)

    photo = Photo(
        session_id=anon_session.id,
        original_file_url=f"/static/uploads/{saved_name}",
        status=PhotoStatus.PENDING,
        detected_gender=detected_gender,
        selected_gender=detected_gender,
        detection_confidence=client_gender_confidence if detected_gender else None,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)

    return {
        "photo_id": photo.id,
        "session_token": anon_session.token,
        "url": photo.original_file_url,
        "status": photo.status,
    }


@router.post("/{photo_id}/detect-gender")
def detect_gender(photo_id: uuid.UUID, db: Session = Depends(get_session)):
    photo = db.get(Photo, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="عکس یافت نشد")

    photo.status = PhotoStatus.DETECTING
    db.add(photo)
    db.commit()

    # Gender is normally already known from client-side detection at
    # upload time (see photoPreprocess.ts). Only fall back to a male
    # default here if the client couldn't supply one (JS blocked/failed).
    if photo.detected_gender is None:
        photo.detected_gender = Gender.MALE
        photo.selected_gender = Gender.MALE
        photo.detection_confidence = 1.0

    photo.status = PhotoStatus.DETECTED
    db.add(photo)
    db.commit()
    db.refresh(photo)

    return {
        "photo_id": photo.id,
        "gender": photo.detected_gender,
        "confidence": photo.detection_confidence,
    }


class GenerateBody(BaseModel):
    gender: Gender
    outfit_type: str
    background_color: str


@router.post("/{photo_id}/generate")
def generate_photo(
    photo_id: uuid.UUID, body: GenerateBody, db: Session = Depends(get_session)
):
    """Replaces the background via the admin-configured AI provider/model
    and crops the result to an exact 3:4 headshot. outfit_type is stored
    but not yet applied to the pixels (see module docstring / task notes)."""
    photo = db.get(Photo, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="عکس یافت نشد")

    photo.selected_gender = body.gender
    photo.outfit_type = body.outfit_type
    photo.background_color = body.background_color
    photo.status = PhotoStatus.GENERATING
    db.add(photo)
    db.commit()

    original_path = UPLOAD_DIR / Path(photo.original_file_url).name
    result_name = f"result_{uuid.uuid4().hex}.jpg"
    result_path = UPLOAD_DIR / result_name

    try:
        generate_id_photo(str(original_path), str(result_path), body.background_color, db)
    except PhotoGenerationError as exc:
        photo.status = PhotoStatus.FAILED
        db.add(photo)
        db.commit()
        raise HTTPException(status_code=502, detail=str(exc))

    photo.result_file_url = f"/static/uploads/{result_name}"
    photo.status = PhotoStatus.COMPLETED
    photo.ai_meta = {
        "outfit_requested": body.outfit_type,
        "background_applied": body.background_color,
        "note": (
            "background replaced via the admin-configured AI provider/model, "
            "cropped to exact 3:4; face/gender detection happened "
            "client-side before upload; outfit swap not yet implemented "
            "(needs a generative model)"
        ),
    }
    db.add(photo)
    db.commit()
    db.refresh(photo)

    return {
        "photo_id": photo.id,
        "status": photo.status,
        "result_photo_url": photo.result_file_url,
    }


@router.get("/mine")
def list_my_photos(
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Backs the "عکس‌های من" tab in the customer account panel. Registered
    before /{photo_id} so the literal "mine" segment isn't swallowed by it."""
    return db.exec(
        select(Photo)
        .where(Photo.user_id == user.id, Photo.status == PhotoStatus.COMPLETED)
        .order_by(Photo.created_at.desc())
    ).all()


@router.get("/{photo_id}")
def get_photo(photo_id: uuid.UUID, db: Session = Depends(get_session)):
    photo = db.get(Photo, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="عکس یافت نشد")
    return photo

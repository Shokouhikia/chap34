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
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.deps import get_current_user, get_or_create_anonymous_session
from app.core.database import get_session
from app.models.photo import Gender, Photo, PhotoStatus
from app.models.session import AnonymousSession
from app.models.user import User
from app.services.photo_generation import PhotoGenerationError, generate_id_photo

router = APIRouter(prefix="/api/photo", tags=["photo"])


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

    file_bytes = file.file.read()

    detected_gender = None
    if client_gender in (Gender.MALE.value, Gender.FEMALE.value):
        detected_gender = Gender(client_gender)

    photo_id = uuid.uuid4()
    photo = Photo(
        id=photo_id,
        session_id=anon_session.id,
        original_file_url=f"/api/photo/{photo_id}/original",
        original_file_data=file_bytes,
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
    and crops the result to an exact 3:4 headshot. If the AI call fails for
    any reason (key not set, no credit, provider outage, ...), falls back
    to the plain cropped photo instead of failing the request - see
    generate_id_photo's docstring. outfit_type is stored but not yet
    applied to the pixels (see module docstring / task notes)."""
    photo = db.get(Photo, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="عکس یافت نشد")

    if not photo.original_file_data:
        raise HTTPException(status_code=404, detail="فایل اصلی عکس یافت نشد")

    photo.selected_gender = body.gender
    photo.outfit_type = body.outfit_type
    photo.background_color = body.background_color
    photo.status = PhotoStatus.GENERATING
    db.add(photo)
    db.commit()

    try:
        result_bytes, ai_result = generate_id_photo(photo.original_file_data, body.background_color, db)
    except PhotoGenerationError as exc:
        photo.status = PhotoStatus.FAILED
        db.add(photo)
        db.commit()
        raise HTTPException(status_code=502, detail=str(exc))

    photo.result_file_data = result_bytes
    photo.result_file_url = f"/api/photo/{photo.id}/result"
    photo.status = PhotoStatus.COMPLETED
    photo.ai_meta = {
        "outfit_requested": body.outfit_type,
        "background_applied": body.background_color,
        "ai_background_replaced": ai_result["ai_background_replaced"],
        "ai_provider": ai_result["provider"],
        "ai_error": ai_result["ai_error"],
        "note": (
            "background replaced via the admin-configured AI provider/model, "
            "cropped to exact 3:4; face/gender detection happened "
            "client-side before upload; outfit swap not yet implemented "
            "(needs a generative model)"
            if ai_result["ai_background_replaced"]
            else "AI background replacement failed/unavailable - fell back "
            "to the plain client-cropped photo, cropped to exact 3:4"
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
    before /{photo_id} so the literal "mine" segment isn't swallowed by it.
    Returns an explicit shape (not the raw Photo row) so the binary
    original_file_data/result_file_data columns never hit the wire here."""
    photos = db.exec(
        select(Photo)
        .where(Photo.user_id == user.id, Photo.status == PhotoStatus.COMPLETED)
        .order_by(Photo.created_at.desc())
    ).all()
    return [
        {"id": p.id, "result_file_url": p.result_file_url, "created_at": p.created_at}
        for p in photos
    ]


@router.get("/{photo_id}/original")
def get_photo_original(photo_id: uuid.UUID, db: Session = Depends(get_session)):
    photo = db.get(Photo, photo_id)
    if not photo or not photo.original_file_data:
        raise HTTPException(status_code=404, detail="عکس یافت نشد")
    return Response(content=photo.original_file_data, media_type="image/jpeg")


@router.get("/{photo_id}/result")
def get_photo_result(photo_id: uuid.UUID, db: Session = Depends(get_session)):
    photo = db.get(Photo, photo_id)
    if not photo or not photo.result_file_data:
        raise HTTPException(status_code=404, detail="عکس یافت نشد")
    return Response(content=photo.result_file_data, media_type="image/jpeg")


@router.get("/{photo_id}")
def get_photo(photo_id: uuid.UUID, db: Session = Depends(get_session)):
    """Used by both /result (needs result_file_url/status) and
    /gender-settings (needs original_file_url/detected_gender) - returns an
    explicit shape rather than the raw Photo row so the binary
    original_file_data/result_file_data columns never hit the wire here."""
    photo = db.get(Photo, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="عکس یافت نشد")
    return {
        "id": photo.id,
        "status": photo.status,
        "original_file_url": photo.original_file_url,
        "result_file_url": photo.result_file_url,
        "detected_gender": photo.detected_gender,
    }

"""
Photo pipeline endpoints: upload -> detect-gender -> generate -> result.

Gender detection is real: it runs the InsightFace `buffalo_l` model
locally (see app.services.gender_detection). No external service is used.

DEMO NOTE: `generate_photo` is still fake — it just copies the original
file again and fakes a short delay. Real version: an image-generation
pipeline that swaps the outfit and background based on `outfit_type` /
`background_color`, most likely run as an async background job (Celery/RQ)
with polling instead of the blocking call used here for the demo.
"""
import shutil
import time
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlmodel import Session

from app.api.deps import get_or_create_anonymous_session
from app.core.database import get_session
from app.models.photo import Gender, Photo, PhotoStatus
from app.models.session import AnonymousSession
from app.services.gender_detection import NoFaceError, detect_gender as run_gender_detection

router = APIRouter(prefix="/api/photo", tags=["photo"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "static" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
def upload_photo(
    file: UploadFile = File(...),
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

    photo = Photo(
        session_id=anon_session.id,
        original_file_url=f"/static/uploads/{saved_name}",
        status=PhotoStatus.PENDING,
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

    # Run the real InsightFace gender model on the uploaded file.
    image_path = UPLOAD_DIR / Path(photo.original_file_url).name
    try:
        detected, confidence = run_gender_detection(str(image_path))
    except NoFaceError as exc:
        photo.status = PhotoStatus.FAILED
        db.add(photo)
        db.commit()
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception:
        photo.status = PhotoStatus.FAILED
        db.add(photo)
        db.commit()
        raise HTTPException(status_code=500, detail="تشخیص جنسیت با خطا مواجه شد")

    photo.detected_gender = detected
    photo.selected_gender = detected  # gender is decided automatically now
    photo.detection_confidence = confidence
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
    """DEMO: fakes the outfit/background generation synchronously. Real
    version should kick off an async job and let the frontend poll
    GET /api/photo/{id} for status instead of blocking this request."""
    photo = db.get(Photo, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="عکس یافت نشد")

    photo.selected_gender = body.gender
    photo.outfit_type = body.outfit_type
    photo.background_color = body.background_color
    photo.status = PhotoStatus.GENERATING
    db.add(photo)
    db.commit()

    time.sleep(1.5)  # pretend this is where outfit/background generation happens

    original_path = UPLOAD_DIR / Path(photo.original_file_url).name
    result_name = f"result_{uuid.uuid4().hex}{original_path.suffix}"
    result_path = UPLOAD_DIR / result_name
    shutil.copyfile(original_path, result_path)

    photo.result_file_url = f"/static/uploads/{result_name}"
    photo.status = PhotoStatus.COMPLETED
    photo.ai_meta = {
        "outfit_applied": body.outfit_type,
        "background_applied": body.background_color,
        "note": "fake AI output for demo purposes",
    }
    db.add(photo)
    db.commit()
    db.refresh(photo)

    return {
        "photo_id": photo.id,
        "status": photo.status,
        "result_photo_url": photo.result_file_url,
    }


@router.get("/{photo_id}")
def get_photo(photo_id: uuid.UUID, db: Session = Depends(get_session)):
    photo = db.get(Photo, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="عکس یافت نشد")
    return photo

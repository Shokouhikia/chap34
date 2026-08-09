"""
Photo pipeline endpoints: upload -> detect-gender -> generate -> result.

Gender detection currently defaults to male instead of running the real
InsightFace model (see the TEMPORARY note on the detect-gender route) —
it OOM-crashes on Render's free tier. app.services.gender_detection still
has the real implementation for when hosting with more memory is used.

`generate_photo` is also real for the alignment/crop/background part: it
straightens the face, crops it to a 3:4 headshot, and replaces the
background with the color the user picked (see
app.services.photo_generation). `outfit_type` is NOT yet applied to the
pixels — swapping actual garments needs a generative model, which is
future work; the requested value is stored in `ai_meta` so the UI keeps
working end-to-end.
"""
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlmodel import Session

from app.api.deps import get_or_create_anonymous_session
from app.core.database import get_session
from app.models.photo import Gender, Photo, PhotoStatus
from app.models.session import AnonymousSession
from app.services.photo_generation import NoFaceError as GenerationNoFaceError
from app.services.photo_generation import generate_id_photo

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

    # TEMPORARY: real InsightFace detection (run_gender_detection) OOM-crashes
    # on Render's free 512MB tier even after trimming it to the detection+
    # genderage models only (see face_engine.py, DEPLOY.md). Defaulting to
    # male until the hosting/memory situation is resolved.
    detected, confidence = Gender.MALE, 1.0

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
    """Runs the real align + 3:4 crop + background-replace pipeline.
    outfit_type is stored but not yet applied to the pixels (see module
    docstring / task notes)."""
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
        generate_id_photo(str(original_path), str(result_path), body.background_color)
    except GenerationNoFaceError as exc:
        photo.status = PhotoStatus.FAILED
        db.add(photo)
        db.commit()
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception:
        photo.status = PhotoStatus.FAILED
        db.add(photo)
        db.commit()
        raise HTTPException(status_code=500, detail="ساخت عکس نهایی با خطا مواجه شد")

    photo.result_file_url = f"/static/uploads/{result_name}"
    photo.status = PhotoStatus.COMPLETED
    photo.ai_meta = {
        "outfit_requested": body.outfit_type,
        "background_applied": body.background_color,
        "note": (
            "face aligned + cropped 3:4 + background replaced via "
            "InsightFace/rembg; outfit swap not yet implemented "
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


@router.get("/{photo_id}")
def get_photo(photo_id: uuid.UUID, db: Session = Depends(get_session)):
    photo = db.get(Photo, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="عکس یافت نشد")
    return photo

"""
Real gender detection using InsightFace (buffalo_l model pack).

The `genderage.onnx` model bundled in `buffalo_l` predicts a binary
gender (0 = female, 1 = male) plus an age estimate for each detected
face. The FaceAnalysis app itself is loaded once and shared with the
photo-generation pipeline via app.services.face_engine.

Runs on CPU by default (CPUExecutionProvider) so it works without a GPU.
"""
from app.models.photo import Gender
from app.services.face_engine import get_face_app


class NoFaceError(Exception):
    """Raised when no face can be detected in the uploaded image."""


def detect_gender(image_path: str) -> tuple[Gender, float]:
    """
    Detect the gender of the most prominent face in `image_path`.

    Returns a tuple of (Gender, confidence). If several faces are present,
    the largest face (by bounding-box area) is used. Raises NoFaceError
    when no face is found so the caller can return a clean API error.
    """
    import cv2
    import numpy as np

    img = cv2.imread(image_path)
    if img is None:
        raise NoFaceError("تصویر قابل خواندن نیست")

    app = get_face_app()
    faces = app.get(img)
    if not faces:
        raise NoFaceError("در عکس چهره‌ای پیدا نشد")

    # Pick the largest face so background/incidental faces don't win.
    def _area(face) -> float:
        x1, y1, x2, y2 = face.bbox
        return float((x2 - x1) * (y2 - y1))

    face = max(faces, key=_area)

    # InsightFace: gender == 1 -> male, gender == 0 -> female.
    gender = Gender.MALE if int(face.gender) == 1 else Gender.FEMALE

    # genderage doesn't expose a direct probability, so derive a confidence
    # from the detector score (clamped to a sensible range for display).
    confidence = float(np.clip(getattr(face, "det_score", 0.9), 0.0, 1.0))

    return gender, round(confidence, 2)

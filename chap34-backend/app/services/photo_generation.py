"""
Real photo-generation pipeline: face alignment, 3:4 crop, background
removal + replacement.

Outfit swapping (`outfit_type`) is intentionally NOT implemented here —
see the module-level scope note in the task this file came from. Changing
what someone is wearing needs a generative model (diffusion inpainting /
virtual try-on); this module only handles the classic-CV part (straighten
+ crop + background).
"""
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from app.services.face_engine import get_face_app

BACKGROUND_COLORS = {
    "white": (255, 255, 255),
    "blue": (207, 224, 255),   # matches the #cfe0ff swatch in gender-settings
    "gray": (230, 230, 230),   # matches the #e6e6e6 swatch in gender-settings
}

# Standard head-and-shoulders ID-photo framing: eyes sit ~42% down from
# the top of the frame, and the crop height is ~2.6x the eye-to-eye
# distance. Same style of ratios used by passport/visa photo tools.
EYE_LINE_RATIO = 0.42
CROP_HEIGHT_TO_EYE_DIST = 2.6
TARGET_ASPECT = 3 / 4  # width / height


class NoFaceError(Exception):
    """Raised when no face can be detected in the uploaded image."""


def _largest_face(faces):
    def _area(face) -> float:
        x1, y1, x2, y2 = face.bbox
        return float((x2 - x1) * (y2 - y1))

    return max(faces, key=_area)


def _align_face(img: np.ndarray, kps: np.ndarray) -> np.ndarray:
    """Rotate `img` on a padded canvas so the eye line is horizontal."""
    left_eye, right_eye = kps[0], kps[1]
    dy = right_eye[1] - left_eye[1]
    dx = right_eye[0] - left_eye[0]
    angle = math.degrees(math.atan2(dy, dx))

    eyes_center = ((left_eye[0] + right_eye[0]) / 2, (left_eye[1] + right_eye[1]) / 2)
    h, w = img.shape[:2]

    # Rotate on a diagonal-sized canvas so the head/shoulders never get
    # clipped by the rotation.
    diag = int(math.ceil(math.hypot(w, h)))
    canvas = np.zeros((diag, diag, 3), dtype=img.dtype)
    y_off = (diag - h) // 2
    x_off = (diag - w) // 2
    canvas[y_off:y_off + h, x_off:x_off + w] = img

    center = (eyes_center[0] + x_off, eyes_center[1] + y_off)
    rot_mat = cv2.getRotationMatrix2D(center, angle, 1.0)
    aligned = cv2.warpAffine(
        canvas, rot_mat, (diag, diag),
        flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE,
    )
    return aligned


def _crop_3x4(img: np.ndarray, eyes_center: tuple, eye_dist: float) -> np.ndarray:
    """Crop a 3:4 headshot around the (already aligned) face."""
    crop_h = eye_dist * CROP_HEIGHT_TO_EYE_DIST
    crop_w = crop_h * TARGET_ASPECT

    cx, cy = eyes_center
    top = cy - crop_h * EYE_LINE_RATIO
    left = cx - crop_w / 2

    h, w = img.shape[:2]
    top = int(np.clip(top, 0, max(0, h - crop_h)))
    left = int(np.clip(left, 0, max(0, w - crop_w)))
    bottom = int(min(h, top + crop_h))
    right = int(min(w, left + crop_w))

    cropped = img[top:bottom, left:right]

    # If the face was too close to an edge, the crop may fall short of a
    # perfect 3:4 — pad it so the output is always exactly 3:4.
    ch, cw = cropped.shape[:2]
    target_h = int(round(cw / TARGET_ASPECT))
    if ch < target_h:
        pad = target_h - ch
        cropped = cv2.copyMakeBorder(cropped, 0, pad, 0, 0, cv2.BORDER_REPLICATE)
    return cropped


def _remove_and_replace_background(img_bgr: np.ndarray, background_color: str) -> np.ndarray:
    from rembg import remove

    rgb_color = BACKGROUND_COLORS.get(background_color, BACKGROUND_COLORS["white"])

    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(img_rgb)

    cutout = remove(pil_img)  # RGBA, subject isolated

    bg = Image.new("RGB", cutout.size, rgb_color)
    bg.paste(cutout, mask=cutout.split()[3])  # alpha channel as mask

    return cv2.cvtColor(np.array(bg), cv2.COLOR_RGB2BGR)


def generate_id_photo(source_path: str, dest_path: str, background_color: str = "white") -> None:
    """
    Full pipeline: detect the face, straighten it, crop to a 3:4 headshot,
    then remove and replace the background. Writes the result to
    `dest_path`. Raises NoFaceError if no face is found.
    """
    img = cv2.imread(source_path)
    if img is None:
        raise NoFaceError("تصویر قابل خواندن نیست")

    face_app = get_face_app()
    faces = face_app.get(img)
    if not faces:
        raise NoFaceError("در عکس چهره‌ای پیدا نشد")
    face = _largest_face(faces)

    aligned = _align_face(img, face.kps)

    # Re-detect on the aligned canvas to get accurate post-rotation
    # landmarks (single face, cheap — same image just rotated).
    faces_aligned = face_app.get(aligned)
    if not faces_aligned:
        raise NoFaceError("چهره پس از صاف‌سازی پیدا نشد")
    face_aligned = _largest_face(faces_aligned)

    left_eye, right_eye = face_aligned.kps[0], face_aligned.kps[1]
    eyes_center = ((left_eye[0] + right_eye[0]) / 2, (left_eye[1] + right_eye[1]) / 2)
    eye_dist = float(np.linalg.norm(right_eye - left_eye))

    cropped = _crop_3x4(aligned, eyes_center, eye_dist)
    final = _remove_and_replace_background(cropped, background_color)

    Path(dest_path).parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(dest_path, final)

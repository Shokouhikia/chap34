"""
Photo-generation pipeline: background removal/replacement via the
admin-configured AI provider, then a final deterministic 3:4 crop.

Face detection, gender detection, EXIF-rotation and the initial head-and-
shoulders crop all happen client-side in the browser now (see
chap34-frontend/lib/photoPreprocess.ts) before the photo is ever uploaded -
this backend never sees a raw, unframed photo, and never runs its own face
detection. That's what let InsightFace/onnxruntime/rembg (the actual cause
of the OOM crashes on Render's free 512MB tier) be removed entirely rather
than bypassed with another fallback.

Outfit swapping (`outfit_type`) is intentionally NOT implemented here - see
the module-level scope note in the task this file came from. Changing what
someone is wearing needs a generative model (diffusion inpainting / virtual
try-on); this module only handles background replacement.
"""
import base64
import time
from io import BytesIO

import httpx
from PIL import Image
from sqlmodel import Session

from app.core.config import settings
from app.models.setting import (
    DEFAULT_AVALAI_MODEL,
    KEY_AI_PROVIDER,
    KEY_AVALAI_API_KEY,
    KEY_AVALAI_MODEL,
)
from app.services import settings_service

BACKGROUND_COLORS = {
    "white": (255, 255, 255),
    "blue": (207, 224, 255),   # matches the #cfe0ff swatch in gender-settings
    "gray": (230, 230, 230),   # matches the #e6e6e6 swatch in gender-settings
}

TARGET_ASPECT = 3 / 4  # width / height

OPENAI_IMAGES_EDIT_URL = "https://api.openai.com/v1/images/edits"
# Lowest quality/size tier that's still enough for a print headshot - keeps
# the per-call cost down (see the token/cost discussion this pipeline came
# out of). Bump these if print quality ends up too low in practice.
OPENAI_IMAGE_SIZE = "1024x1024"
OPENAI_IMAGE_QUALITY = "low"

# AvalAI proxies OpenAI's own image models on /v1/images/edits, but Gemini
# image models ("gemini-*-image") are only reachable through its
# OpenAI-compatible /v1/chat/completions endpoint with modalities=
# ["image","text"] - confirmed against AvalAI's own docs after a live probe
# of /v1/images/edits with a Gemini model returned "unsupported_model" for
# that path regardless of API key permissions.
AVALAI_CHAT_COMPLETIONS_URL = "https://api.avalai.ir/v1/chat/completions"
# AvalAI's gateway has been observed to return a transient 5xx (its own
# "internal_server_error"/Cloudflare 504) on an otherwise-valid request; one
# retry after a short wait clears this most of the time (seen live twice).
AVALAI_RETRY_ATTEMPTS = 2
AVALAI_RETRY_DELAY_S = 3.0


class PhotoGenerationError(Exception):
    """Raised when the background-removal pipeline can't produce a result."""


def _background_prompt(background_color: str) -> str:
    color_name = background_color if background_color in BACKGROUND_COLORS else "white"
    return (
        f"Replace only the background of this headshot photo with a plain, "
        f"solid {color_name} background, like a passport/ID photo backdrop. "
        f"Keep the person, their pose, framing, and clothing completely "
        f"unchanged - do not alter the subject at all."
    )


def _call_openai_background_edit(image_bytes: bytes, background_color: str) -> bytes:
    """
    Sends the (already client-cropped) photo to OpenAI's Images edit
    endpoint and asks it to replace the background with a solid color,
    keeping the subject unchanged. Returns the raw bytes of the result
    image. Raises PhotoGenerationError on any failure.
    """
    if not settings.openai_api_key:
        raise PhotoGenerationError("OPENAI_API_KEY تنظیم نشده است")

    try:
        response = httpx.post(
            OPENAI_IMAGES_EDIT_URL,
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            data={
                "model": "gpt-image-1",
                "prompt": _background_prompt(background_color),
                "size": OPENAI_IMAGE_SIZE,
                "quality": OPENAI_IMAGE_QUALITY,
                "n": 1,
            },
            files={"image": ("photo.png", image_bytes, "image/png")},
            timeout=60.0,
        )
    except httpx.HTTPError as exc:
        raise PhotoGenerationError(f"اتصال به سرویس پردازش عکس برقرار نشد: {exc}") from exc

    if response.status_code != 200:
        raise PhotoGenerationError(
            f"سرویس پردازش عکس خطا داد ({response.status_code}): {response.text[:500]}"
        )

    try:
        b64_data = response.json()["data"][0]["b64_json"]
        return base64.b64decode(b64_data)
    except (KeyError, IndexError, ValueError) as exc:
        raise PhotoGenerationError("پاسخ سرویس پردازش عکس نامعتبر بود") from exc


def _call_avalai_background_edit(
    image_bytes: bytes, background_color: str, api_key: str, model: str
) -> bytes:
    """
    Same contract as `_call_openai_background_edit` but via AvalAI's
    chat-completions endpoint, which is how it fronts Gemini's image
    models (see the AVALAI_CHAT_COMPLETIONS_URL comment).
    The input photo rides along as an image_url content part next to the
    text prompt; modalities=["image","text"] asks for an image back.
    """
    if not api_key:
        raise PhotoGenerationError("AvalAI API Key در تنظیمات ادمین تنظیم نشده است")

    b64_input = base64.b64encode(image_bytes).decode("ascii")
    body = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": _background_prompt(background_color)},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{b64_input}"},
                    },
                ],
            }
        ],
        "modalities": ["image", "text"],
    }

    response: httpx.Response | None = None
    for attempt in range(AVALAI_RETRY_ATTEMPTS):
        try:
            response = httpx.post(
                AVALAI_CHAT_COMPLETIONS_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=body,
                timeout=60.0,
            )
        except httpx.HTTPError as exc:
            raise PhotoGenerationError(f"اتصال به AvalAI برقرار نشد: {exc}") from exc

        if response.status_code < 500 or attempt == AVALAI_RETRY_ATTEMPTS - 1:
            break
        time.sleep(AVALAI_RETRY_DELAY_S)

    if response.status_code != 200:
        raise PhotoGenerationError(
            f"AvalAI خطا داد ({response.status_code}): {response.text[:500]}"
        )

    try:
        image_url = response.json()["choices"][0]["message"]["images"][0]["image_url"]["url"]
        # image_url is a data: URI ("data:image/png;base64,...").
        b64_data = image_url.split(",", 1)[1]
        return base64.b64decode(b64_data)
    except (KeyError, IndexError, ValueError) as exc:
        raise PhotoGenerationError("پاسخ AvalAI نامعتبر بود") from exc


def _ensure_exact_3x4(image: Image.Image) -> Image.Image:
    """
    Centered crop/pad so the output is always exactly 3:4, regardless of
    what size/aspect the OpenAI edit happens to return. No face landmarks
    needed here - the client already framed the shot before upload.
    """
    w, h = image.size
    if w / h > TARGET_ASPECT:
        new_w = round(h * TARGET_ASPECT)
        left = (w - new_w) // 2
        return image.crop((left, 0, left + new_w, h))
    else:
        new_h = round(w / TARGET_ASPECT)
        top = (h - new_h) // 2
        return image.crop((0, top, w, top + new_h))


def generate_id_photo(
    source_bytes: bytes, background_color: str, db: Session
) -> tuple[bytes, dict]:
    """
    Takes the client-prepped photo's raw bytes, tries to replace its
    background via the admin-configured AI provider (AvalAI - Gemini image
    models - by default, OpenAI as an alternative), and crops the
    result to an exact 3:4 headshot. Returns the final JPEG bytes for the
    caller to store (in Postgres, not local disk - see Photo model
    docstring) alongside a dict describing what happened.

    If the AI call fails for any reason (no API key set, no credit, provider
    outage, bad response, ...) this does NOT fail the request - it falls
    back to the plain client-cropped photo as-is so the user's flow always
    completes with a usable (if unedited) result. The only thing that still
    raises PhotoGenerationError is a source photo that can't even be read,
    since there's nothing to fall back to in that case.

    The dict is for the caller to record in `Photo.ai_meta`:
    {"ai_background_replaced": bool, "provider": str, "ai_error": str | None}.
    """
    try:
        source_image = Image.open(BytesIO(source_bytes)).convert("RGB")
    except Exception as exc:
        raise PhotoGenerationError("تصویر قابل خواندن نیست") from exc

    source_buffer = BytesIO()
    source_image.save(source_buffer, format="PNG")
    image_bytes = source_buffer.getvalue()

    provider = settings_service.get_value(db, KEY_AI_PROVIDER) or "avalai"
    result_image = source_image
    ai_error: str | None = None
    try:
        if provider == "openai":
            result_bytes = _call_openai_background_edit(image_bytes, background_color)
        else:
            api_key = settings_service.get_value(db, KEY_AVALAI_API_KEY)
            model = settings_service.get_value(db, KEY_AVALAI_MODEL) or DEFAULT_AVALAI_MODEL
            result_bytes = _call_avalai_background_edit(image_bytes, background_color, api_key, model)
        result_image = Image.open(BytesIO(result_bytes)).convert("RGB")
    except PhotoGenerationError as exc:
        ai_error = str(exc)
    except Exception as exc:
        ai_error = f"خطای غیرمنتظره در پردازش هوش مصنوعی: {exc}"

    final = _ensure_exact_3x4(result_image)

    dest_buffer = BytesIO()
    final.save(dest_buffer, format="JPEG", quality=92)

    return dest_buffer.getvalue(), {
        "ai_background_replaced": ai_error is None,
        "provider": provider,
        "ai_error": ai_error,
    }

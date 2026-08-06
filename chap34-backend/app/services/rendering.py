"""
Shared low-level rendering helpers for every printable the panels produce
(print sheets, shipping labels, post-delivery lists): Persian text shaping,
font loading, and exporting a Pillow image (or list of images) to PNG or
multi-page PDF bytes.

Persian is drawn with Pillow, which does no glyph-joining or RTL reordering
on its own, so every Persian string is passed through `shape_fa` first.
"""
from __future__ import annotations

import io
import os
from functools import lru_cache

from PIL import Image, ImageDraw, ImageFont

try:  # optional at import time so the module still loads if they're absent
    import arabic_reshaper
    from bidi.algorithm import get_display

    _SHAPING = True
except Exception:  # pragma: no cover - defensive
    _SHAPING = False


# Candidate font files, in priority order. A Persian-capable TTF is required
# for names to render; Tahoma/Arial cover it on Windows dev boxes. On Linux
# set CHAP34_FONT_PATH to a Persian TTF (e.g. Vazirmatn) shipped with the app.
_FONT_CANDIDATES = [
    os.environ.get("CHAP34_FONT_PATH"),
    r"C:\Windows\Fonts\tahoma.ttf",
    r"C:\Windows\Fonts\arial.ttf",
    "/usr/share/fonts/truetype/vazirmatn/Vazirmatn-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]
_BOLD_CANDIDATES = [
    os.environ.get("CHAP34_FONT_BOLD_PATH"),
    r"C:\Windows\Fonts\tahomabd.ttf",
    r"C:\Windows\Fonts\arialbd.ttf",
    "/usr/share/fonts/truetype/vazirmatn/Vazirmatn-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def _first_existing(candidates: list[str | None]) -> str | None:
    for path in candidates:
        if path and os.path.exists(path):
            return path
    return None


@lru_cache(maxsize=32)
def get_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = _first_existing(_BOLD_CANDIDATES if bold else _FONT_CANDIDATES)
    if path:
        try:
            return ImageFont.truetype(path, size)
        except Exception:  # pragma: no cover
            pass
    # Last resort: Pillow's built-in bitmap font (Latin-only, unsized).
    return ImageFont.load_default()


def shape_fa(text: str) -> str:
    """Reshape + bidi-reorder a Persian/Arabic string so Pillow draws it with
    joined glyphs in the correct visual (RTL) order. No-op if the shaping
    libraries aren't installed or the text is empty."""
    if not text or not _SHAPING:
        return text
    try:
        return get_display(arabic_reshaper.reshape(text))
    except Exception:  # pragma: no cover - never let rendering crash on text
        return text


def draw_text_rtl(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill=(0, 0, 0),
    anchor: str = "ra",
) -> None:
    """Draw already-known-Persian text right-aligned at xy. `xy` is the
    right edge by default (anchor 'ra'), matching RTL reading."""
    draw.text(xy, shape_fa(text), font=font, fill=fill, anchor=anchor)


def image_to_png_bytes(image: Image.Image) -> bytes:
    buf = io.BytesIO()
    image.convert("RGB").save(buf, format="PNG")
    return buf.getvalue()


def images_to_pdf_bytes(images: list[Image.Image]) -> bytes:
    if not images:
        raise ValueError("no pages to render")
    pages = [img.convert("RGB") for img in images]
    buf = io.BytesIO()
    pages[0].save(buf, format="PDF", save_all=True, append_images=pages[1:])
    return buf.getvalue()


def render_output(images: list[Image.Image], fmt: str) -> tuple[bytes, str]:
    """Export a list of sheet images to the requested format.

    Returns (bytes, media_type). For PNG with multiple pages, only the first
    page is returned (PNG is single-image) - callers that can produce >1 page
    should offer PDF for the multi-page case.
    """
    fmt = (fmt or "png").lower()
    if fmt == "pdf":
        return images_to_pdf_bytes(images), "application/pdf"
    return image_to_png_bytes(images[0]), "image/png"

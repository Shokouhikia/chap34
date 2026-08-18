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
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

try:  # optional at import time so the module still loads if they're absent
    import arabic_reshaper
    from bidi.algorithm import get_display

    _SHAPING = True
except Exception:  # pragma: no cover - defensive
    _SHAPING = False


# Vazirmatn (SIL OFL 1.1) is vendored in the repo so printables render Persian
# identically on every host. This matters because the deploy image is
# python:3.13-slim, which ships NO fonts at all: previously every candidate
# below was a system path that didn't exist there, so get_font() fell through
# to ImageFont.load_default() - a Latin-only bitmap font that ALSO ignores the
# requested size. That's why Persian came out as boxes and all sheet/label
# text was microscopic on 300dpi output.
_BUNDLED_FONT_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"

# Candidate font files, in priority order. System fonts are kept as fallbacks
# after the bundled ones (Tahoma/Arial cover Persian on Windows dev boxes).
# Note DejaVuSans is deliberately last: it has no Arabic/Persian glyphs, so
# it's a legibility fallback for Latin only, not a Persian one.
_FONT_CANDIDATES = [
    os.environ.get("CHAP34_FONT_PATH"),
    str(_BUNDLED_FONT_DIR / "Vazirmatn-Regular.ttf"),
    r"C:\Windows\Fonts\tahoma.ttf",
    r"C:\Windows\Fonts\arial.ttf",
    "/usr/share/fonts/truetype/vazirmatn/Vazirmatn-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]
_BOLD_CANDIDATES = [
    os.environ.get("CHAP34_FONT_BOLD_PATH"),
    str(_BUNDLED_FONT_DIR / "Vazirmatn-Bold.ttf"),
    r"C:\Windows\Fonts\tahomabd.ttf",
    r"C:\Windows\Fonts\arialbd.ttf",
    "/usr/share/fonts/truetype/vazirmatn/Vazirmatn-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]

# Sheets/labels are laid out in 300dpi pixel space, so PDFs must declare that
# resolution. Pillow's PDF writer defaults to 72dpi, which turned a 2480x3508
# A4 sheet into a ~34x49 inch page - printers and viewers then scaled it down,
# which is the other half of the "print quality is low" problem.
PRINT_DPI = 300


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
    # Last resort: Pillow's built-in font (Latin-only, no Persian glyphs).
    # Pass the size through so text at least stays legible at 300dpi instead
    # of collapsing to the ~11px default bitmap.
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # pragma: no cover - Pillow < 10.1 has no size arg
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
    # Same reasoning as the PDF path: declare 300dpi so the file prints at its
    # intended physical size instead of being treated as a 72dpi screenshot.
    image.convert("RGB").save(buf, format="PNG", dpi=(PRINT_DPI, PRINT_DPI))
    return buf.getvalue()


def images_to_pdf_bytes(images: list[Image.Image]) -> bytes:
    if not images:
        raise ValueError("no pages to render")
    pages = [img.convert("RGB") for img in images]
    buf = io.BytesIO()
    # resolution=PRINT_DPI makes each page its true physical size (an A4 sheet
    # comes out 8.27x11.69in instead of Pillow's 72dpi default of ~34x49in).
    pages[0].save(
        buf,
        format="PDF",
        save_all=True,
        append_images=pages[1:],
        resolution=PRINT_DPI,
    )
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

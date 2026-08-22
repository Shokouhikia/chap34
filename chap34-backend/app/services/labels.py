"""
Rendered postal paperwork: a per-order shipping label and a per-shipment
post-delivery hand-off list (BRD 5.2 #6, 5.8 #4-5, 5.8 #9). Rendered as
Pillow images and exported to PNG/PDF through app.services.rendering, so
Persian text goes through the same shaping path as the print sheets.
"""
from __future__ import annotations

from dataclasses import dataclass

import qrcode
from PIL import Image, ImageDraw

from app.services.rendering import get_font, shape_fa

_INK = (20, 20, 46)
_MUTED = (110, 110, 130)
_LINE = (200, 200, 215)
_ACCENT = (108, 76, 241)
_BG = (255, 255, 255)

# 10x15cm label @300dpi.
_LABEL_SIZE = (1181, 1772)
# A4 @300dpi for the post-delivery list.
_A4 = (2480, 3508)
_MARGIN = 60


@dataclass
class LabelData:
    order_code: str
    recipient_name: str
    province: str
    city: str
    full_address: str
    postal_code: str
    phone: str
    tracking_code: str | None = None


def _line(draw, y, x0, x1):
    draw.line([(x0, y), (x1, y)], fill=_LINE, width=2)


def render_shipping_label(data: LabelData) -> Image.Image:
    """One 10x15 postal label for a single order."""
    img = Image.new("RGB", _LABEL_SIZE, _BG)
    draw = ImageDraw.Draw(img)
    w = img.width
    right = w - _MARGIN
    left = _MARGIN

    # Header rule + order code + QR.
    draw.rectangle([left, _MARGIN, right, _MARGIN + 6], fill=_ACCENT)
    draw.text((left, _MARGIN + 24), data.order_code, font=get_font(46, bold=True), fill=_INK, anchor="la")
    qr = qrcode.make(data.order_code).convert("RGB").resize((190, 190))
    img.paste(qr, (right - 190, _MARGIN + 20))

    y = _MARGIN + 240
    draw.text((right, y), shape_fa("گیرنده"), font=get_font(30, bold=True), fill=_ACCENT, anchor="ra")
    y += 55
    draw.text((right, y), shape_fa(data.recipient_name), font=get_font(42, bold=True), fill=_INK, anchor="ra")
    y += 70
    draw.text((right, y), shape_fa(f"{data.province} - {data.city}"), font=get_font(34), fill=_INK, anchor="ra")
    y += 60

    # Wrap the free-form address across lines, capped so an unusually long
    # address can never push the postal code/phone/tracking lines below the
    # label's fixed height - the last visible line gets a "…" instead.
    address_lines = _wrap(data.full_address, 42)
    max_lines = 4
    if len(address_lines) > max_lines:
        address_lines = address_lines[:max_lines]
        address_lines[-1] = address_lines[-1].rstrip() + " …"
    for chunk in address_lines:
        draw.text((right, y), shape_fa(chunk), font=get_font(32), fill=_INK, anchor="ra")
        y += 48
    y += 20
    draw.text((right, y), shape_fa(f"کد پستی: {data.postal_code}"), font=get_font(32), fill=_INK, anchor="ra")
    y += 55
    draw.text((right, y), shape_fa(f"تلفن: {data.phone}"), font=get_font(32), fill=_INK, anchor="ra")

    y += 90
    _line(draw, y, left, right)
    y += 30
    tracking = data.tracking_code or "—"
    draw.text((right, y), shape_fa(f"کد رهگیری پستی: {tracking}"), font=get_font(34, bold=True), fill=_INK, anchor="ra")
    return img


def render_labels_pdf_pages(labels: list[LabelData]) -> list[Image.Image]:
    """A shipment/batch's labels packed 2x2 onto A4 sheets (BRD 5.8 #5),
    instead of wasting one full 10x15 page per single address. Each label
    keeps its own fixed cell, so one never splits across a page boundary -
    a page just holds fewer labels once it's full."""
    if not labels:
        return []

    cols, rows = 2, 2
    per_page = cols * rows
    cell_w, cell_h = _LABEL_SIZE
    gap = 30

    page_w = cell_w * cols + gap * (cols + 1)
    page_h = cell_h * rows + gap * (rows + 1)

    pages: list[Image.Image] = []
    for start in range(0, len(labels), per_page):
        chunk = labels[start:start + per_page]
        page = Image.new("RGB", (page_w, page_h), _BG)
        draw = ImageDraw.Draw(page)
        for i, data in enumerate(chunk):
            col, row = i % cols, i // cols
            x = gap + col * (cell_w + gap)
            y = gap + row * (cell_h + gap)
            page.paste(render_shipping_label(data), (x, y))
            draw.rectangle([x, y, x + cell_w, y + cell_h], outline=_LINE, width=2)
        pages.append(page)
    return pages


def render_post_delivery_list(
    shipment_code: str, rows: list[LabelData]
) -> list[Image.Image]:
    """A4 hand-off manifest listing every order in the shipment (BRD 5.8 #4).
    Paginates when the rows overflow one page."""
    pages: list[Image.Image] = []
    per_page = 22
    total = max(1, (len(rows) + per_page - 1) // per_page)

    for page_idx in range(total):
        img = Image.new("RGB", _A4, _BG)
        draw = ImageDraw.Draw(img)
        right = img.width - _MARGIN
        left = _MARGIN

        draw.text((left, _MARGIN), f"{shipment_code}", font=get_font(44, bold=True), fill=_INK, anchor="la")
        draw.text(
            (right, _MARGIN),
            shape_fa(f"لیست تحویل به پست  (صفحه {page_idx + 1} از {total})"),
            font=get_font(40, bold=True), fill=_ACCENT, anchor="ra",
        )
        y = _MARGIN + 90
        _line(draw, y, left, right)
        y += 20

        # Column headers (RTL): row# | order code | recipient | city | tracking
        draw.text((right, y), shape_fa("ردیف"), font=get_font(28, bold=True), fill=_MUTED, anchor="ra")
        draw.text((right - 160, y), shape_fa("کد سفارش"), font=get_font(28, bold=True), fill=_MUTED, anchor="ra")
        draw.text((right - 620, y), shape_fa("گیرنده"), font=get_font(28, bold=True), fill=_MUTED, anchor="ra")
        draw.text((right - 1250, y), shape_fa("شهر"), font=get_font(28, bold=True), fill=_MUTED, anchor="ra")
        draw.text((left + 60, y), shape_fa("کد رهگیری"), font=get_font(28, bold=True), fill=_MUTED, anchor="la")
        y += 50
        _line(draw, y, left, right)
        y += 28

        start = page_idx * per_page
        for i, row in enumerate(rows[start:start + per_page], start=start + 1):
            draw.text((right, y), shape_fa(str(i)), font=get_font(28), fill=_INK, anchor="ra")
            draw.text((right - 160, y), row.order_code, font=get_font(28), fill=_INK, anchor="ra")
            draw.text((right - 620, y), shape_fa(row.recipient_name), font=get_font(28), fill=_INK, anchor="ra")
            draw.text((right - 1250, y), shape_fa(row.city), font=get_font(28), fill=_INK, anchor="ra")
            draw.text((left + 60, y), (row.tracking_code or "—"), font=get_font(28), fill=_INK, anchor="la")
            y += 46

        pages.append(img)

    return pages


def _wrap(text: str, width: int) -> list[str]:
    words = (text or "").split()
    lines: list[str] = []
    line = ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if len(candidate) > width and line:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    return lines or ["—"]

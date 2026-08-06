"""
Print-sheet layout: arrange the 3x4 photo pieces of one or many orders onto
physical sheets, ready to send to a printer.

This is the single source of the layout logic, called by both the atelier
panel (single / print-queue printing) and the operations panel (batch
printing). It is a pure function: given a list of SheetOrder specs and a
SheetSize it returns a list of Pillow images (one per physical sheet). No
DB, no filesystem, no HTTP - so it's straightforward to unit-test.

Layout rules (BRD 5.2 #11-12, 5.4 #7-8):
- Each order's pieces are laid out contiguously; the order starts with a
  header band carrying its code, an internal QR of the code, the customer
  name and the piece count.
- Pieces flow left-to-right, top-to-bottom. When an order's pieces spill
  past the bottom of a sheet, they continue on the next sheet under a
  "ادامه" (continuation) header.
- Leftover room at the bottom of a sheet is filled by the next order's
  start rather than wasting the sheet.
- A sheet that carries pieces from more than one order is stamped
  "ترکیبی از چند سفارش".
"""
from __future__ import annotations

from dataclasses import dataclass

import qrcode
from PIL import Image, ImageDraw

from app.models.order import SheetSize
from app.services.rendering import draw_text_rtl, get_font, shape_fa


@dataclass
class SheetOrder:
    """One order's worth of pieces to place. `photo` is the finished 3x4
    image (already loaded); None renders a labelled placeholder so the sheet
    still lays out correctly when a file is missing in the demo."""
    order_code: str
    customer_name: str
    quantity: int
    photo: Image.Image | None = None


# Physical geometry at 300 dpi.
_SHEET_PX = {
    SheetSize.SIZE_10X15: (1181, 1772),
    SheetSize.SIZE_A4: (2480, 3508),
}

_MARGIN = 40
_BANNER_H = 90          # top strip on every sheet (sheet title / combined note)
_HEADER_H = 150         # per-order header band
_CELL_W = 354           # 3x4 piece width  @300dpi (~3cm)
_CELL_H = 472           # 3x4 piece height @300dpi (~4cm)
_CELL_PAD = 12          # inner padding inside a cell = cut margin

_BG = (255, 255, 255)
_INK = (20, 20, 46)
_MUTED = (120, 120, 140)
_LINE = (210, 210, 225)
_ACCENT = (108, 76, 241)


def _new_sheet(size: SheetSize) -> Image.Image:
    return Image.new("RGB", _SHEET_PX[size], _BG)


def _draw_qr(sheet: Image.Image, data: str, box: int, xy: tuple[int, int]) -> None:
    qr = qrcode.make(data).convert("RGB").resize((box, box))
    sheet.paste(qr, xy)


def _draw_header(
    sheet: Image.Image,
    top: int,
    order: SheetOrder,
    *,
    continuation: bool,
) -> None:
    """Draw an order header band with its right edge at the sheet margin
    (RTL). Includes an internal QR of the order code."""
    draw = ImageDraw.Draw(sheet)
    width = sheet.width
    right = width - _MARGIN
    left = _MARGIN

    # Band background + accent rule.
    draw.rectangle([left, top, right, top + _HEADER_H], fill=(246, 244, 254))
    draw.rectangle([left, top, right, top + 4], fill=_ACCENT)

    # QR on the far left of the band.
    qr_size = _HEADER_H - 30
    _draw_qr(sheet, order.order_code, qr_size, (left + 12, top + 15))

    title = order.order_code + ("  (ادامه)" if continuation else "")
    draw.text((right, top + 20), title, font=get_font(40, bold=True), fill=_INK, anchor="ra")
    draw_text_rtl(draw, (right, top + 70), f"مشتری: {order.customer_name}", get_font(30), fill=_INK)
    draw_text_rtl(draw, (right, top + 108), f"تعداد قطعه: {order.quantity}", get_font(28), fill=_MUTED)


def _draw_cell(sheet: Image.Image, x: int, y: int, order: SheetOrder) -> None:
    draw = ImageDraw.Draw(sheet)
    # Cut-guide border.
    draw.rectangle([x, y, x + _CELL_W, y + _CELL_H], outline=_LINE, width=1)
    inner = (x + _CELL_PAD, y + _CELL_PAD, x + _CELL_W - _CELL_PAD, y + _CELL_H - _CELL_PAD)
    iw, ih = inner[2] - inner[0], inner[3] - inner[1]
    if order.photo is not None:
        pic = order.photo.convert("RGB").resize((iw, ih))
        sheet.paste(pic, (inner[0], inner[1]))
    else:
        draw.rectangle(inner, fill=(238, 238, 244))
        draw.text(
            (inner[0] + iw // 2, inner[1] + ih // 2),
            shape_fa(order.order_code),
            font=get_font(22),
            fill=_MUTED,
            anchor="mm",
        )


def _stamp_banner(sheet: Image.Image, sheet_no: int, orders_on_sheet: int) -> None:
    draw = ImageDraw.Draw(sheet)
    right = sheet.width - _MARGIN
    y = _MARGIN // 2
    draw.text((_MARGIN, y), f"Sheet {sheet_no}", font=get_font(30, bold=True), fill=_MUTED, anchor="la")
    if orders_on_sheet > 1:
        draw_text_rtl(draw, (right, y), "ترکیبی از چند سفارش", get_font(32, bold=True), fill=_ACCENT)


def build_sheets(orders: list[SheetOrder], sheet_size: SheetSize) -> list[Image.Image]:
    """Lay out every order's pieces onto as many sheets as needed and return
    the finished sheet images in order."""
    sheet_w, sheet_h = _SHEET_PX[sheet_size]
    content_left = _MARGIN
    content_right = sheet_w - _MARGIN
    content_bottom = sheet_h - _MARGIN
    row_top_start = _MARGIN + _BANNER_H

    sheets: list[Image.Image] = []
    orders_per_sheet: list[int] = []

    current = _new_sheet(sheet_size)
    sheets.append(current)
    orders_per_sheet.append(0)

    cursor_x = content_left
    cursor_y = row_top_start
    row_has_cells = False  # whether the current row already holds pieces

    def new_page() -> None:
        nonlocal current, cursor_x, cursor_y, row_has_cells
        current = _new_sheet(sheet_size)
        sheets.append(current)
        orders_per_sheet.append(0)
        cursor_x = content_left
        cursor_y = row_top_start
        row_has_cells = False

    def newline() -> None:
        nonlocal cursor_x, cursor_y, row_has_cells
        cursor_y += _CELL_H
        cursor_x = content_left
        row_has_cells = False

    for order in orders:
        # An order header always starts on a fresh row.
        if row_has_cells:
            newline()
        # If the header itself won't fit, move to a new sheet first.
        if cursor_y + _HEADER_H + _CELL_H > content_bottom:
            new_page()
        _draw_header(current, cursor_y, order, continuation=False)
        orders_per_sheet[-1] += 1
        cursor_y += _HEADER_H
        cursor_x = content_left
        row_has_cells = False

        placed = 0
        while placed < order.quantity:
            # Wrap to next row if this piece would overflow the right edge.
            if cursor_x + _CELL_W > content_right:
                newline()
            # Page break if the row would overflow the bottom.
            if cursor_y + _CELL_H > content_bottom:
                new_page()
                _draw_header(current, cursor_y, order, continuation=True)
                orders_per_sheet[-1] += 1
                cursor_y += _HEADER_H
                cursor_x = content_left
                row_has_cells = False
            _draw_cell(current, cursor_x, cursor_y, order)
            cursor_x += _CELL_W
            placed += 1
            row_has_cells = True

        # Finish this order's last row so the next order starts cleanly below.
        newline()

    for i, sheet in enumerate(sheets):
        _stamp_banner(sheet, i + 1, orders_per_sheet[i])

    return sheets

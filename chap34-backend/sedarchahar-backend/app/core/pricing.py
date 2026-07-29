"""
Server-side pricing matrix for print orders.

DEMO NOTE: the frontend demo currently only varies price by quantity
(6 -> 400,000 / 12 -> 600,000 / 24 -> 800,000 Tomans) and ignores size and
paper type. Here we define a real size x paper_type x quantity matrix so
the backend is the single source of truth for price - the frontend total
is only ever a preview, never trusted. Adjust these numbers freely; they
are placeholders.
"""
from app.models.order import PaperType, PrintSize

# Base price per quantity tier, for the default size (3x4) and paper (glossy).
BASE_PRICE_BY_QUANTITY = {
    6: 400_000,
    12: 600_000,
    24: 800_000,
}

# Multiplier applied on top of the base price above.
SIZE_MULTIPLIER = {
    PrintSize.SIZE_3X4: 1.0,
    PrintSize.SIZE_6X8: 1.25,  # bigger prints cost more
}

PAPER_MULTIPLIER = {
    PaperType.GLOSSY: 1.0,
    PaperType.MATTE: 0.95,  # matte slightly cheaper in this demo pricing
}


def get_price(size: PrintSize, paper_type: PaperType, quantity: int) -> int:
    """
    Returns the total price in Tomans for a given combination, rounded to
    the nearest 1,000 Tomans. Raises ValueError for a quantity that isn't
    one of the supported tiers - the frontend only ever offers 6/12/24,
    so anything else means a client is sending something it shouldn't.
    """
    if quantity not in BASE_PRICE_BY_QUANTITY:
        raise ValueError(f"تعداد {quantity} پشتیبانی نمی‌شود")

    base = BASE_PRICE_BY_QUANTITY[quantity]
    total = base * SIZE_MULTIPLIER[size] * PAPER_MULTIPLIER[paper_type]
    return round(total / 1000) * 1000


def get_pricing_matrix() -> dict:
    """Full matrix, used by GET /api/print/pricing so the frontend can
    render live prices for every combination without hardcoding them."""
    matrix = []
    for quantity in BASE_PRICE_BY_QUANTITY:
        for size in PrintSize:
            for paper in PaperType:
                matrix.append({
                    "quantity": quantity,
                    "size": size.value,
                    "paper_type": paper.value,
                    "price": get_price(size, paper, quantity),
                })
    return {"currency": "toman", "combinations": matrix}

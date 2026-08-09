from app.models.order import PaperType, PrintSize
from app.services import settings_service


def get_price(db_session, size: PrintSize, paper_type: PaperType, quantity: int) -> int:
    base_key = {
        6: "price_base_qty_6",
        12: "price_base_qty_12",
        24: "price_base_qty_24",
    }.get(quantity)

    if not base_key:
        raise ValueError(f"تعداد {quantity} پشتیبانی نمی‌شود")

    base = int(settings_service.get_value(db_session, base_key))
    size_mult = float(settings_service.get_value(db_session, {
        PrintSize.SIZE_3X4: "size_multiplier_3x4",
        PrintSize.SIZE_6X8: "size_multiplier_6x8",
    }[size]))

    paper_mult = float(settings_service.get_value(db_session, {
        PaperType.GLOSSY: "paper_multiplier_glossy",
        PaperType.MATTE: "paper_multiplier_matte",
    }[paper_type]))

    total = base * size_mult * paper_mult
    return round(total / 1000) * 1000


def get_shipping_cost(db_session) -> int:
    return int(settings_service.get_value(db_session, "shipping_cost"))


def get_pricing_matrix(db_session) -> dict:
    from app.models.order import PrintSize, PaperType
    matrix = []
    for quantity in [6, 12, 24]:
        for size in PrintSize:
            for paper in PaperType:
                matrix.append({
                    "quantity": quantity,
                    "size": size.value,
                    "paper_type": paper.value,
                    "price": get_price(db_session, size, paper, quantity),
                })
    return {"currency": "toman", "combinations": matrix}

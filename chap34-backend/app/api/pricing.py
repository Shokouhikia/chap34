from fastapi import APIRouter

from app.core.pricing import get_pricing_matrix

router = APIRouter(prefix="/api/print", tags=["print"])


@router.get("/pricing")
def get_pricing():
    """Full price matrix (size x paper_type x quantity) so the frontend
    can render live prices instead of hardcoding the quantity-only table
    from the current demo."""
    return get_pricing_matrix()

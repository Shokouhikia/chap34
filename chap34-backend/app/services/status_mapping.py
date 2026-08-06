"""
Pure mapping between the 13-stage operational fulfillment lifecycle
(FulfillmentStatus, used by the operations panel) and the 5 display stages
the atelier panel shows its users (BRD section 0.2 of the spec).

Keeping this in one place means the atelier API, the ops API, and any
counting/dashboard logic all agree on the mapping - it is never duplicated.
"""
from app.models.order import FulfillmentStatus


class AtelierStage(str):
    """The 5 coarse stages an atelier sees. Plain string values so they
    serialize straight to JSON for the frontend filter tabs."""
    REGISTERED = "registered"       # ثبت‌شده
    PRINTING = "printing"           # در حال چاپ
    PRINTED = "printed"             # چاپ‌شده
    SHIPPED = "shipped"             # پست‌شده
    DELIVERED = "delivered"         # تحویل


# The 5 atelier stages, in display order, with their Persian labels.
ATELIER_STAGES: list[tuple[str, str]] = [
    (AtelierStage.REGISTERED, "ثبت‌شده"),
    (AtelierStage.PRINTING, "در حال چاپ"),
    (AtelierStage.PRINTED, "چاپ‌شده"),
    (AtelierStage.SHIPPED, "پست‌شده"),
    (AtelierStage.DELIVERED, "تحویل"),
]


# Which operational statuses roll up into each atelier display stage.
_STAGE_MEMBERS: dict[str, list[FulfillmentStatus]] = {
    AtelierStage.REGISTERED: [
        FulfillmentStatus.REGISTERED,
    ],
    AtelierStage.PRINTING: [
        FulfillmentStatus.QUEUED,
        FulfillmentStatus.PRINTING,
        # A rejected order is back in the print queue, so it still reads as
        # "in printing" to the atelier rather than jumping backwards.
        FulfillmentStatus.QC_REJECTED,
    ],
    AtelierStage.PRINTED: [
        FulfillmentStatus.PRINTED,
        FulfillmentStatus.QC_PENDING,
        FulfillmentStatus.SORTING,
        FulfillmentStatus.READY_TO_PACK,
        FulfillmentStatus.PACKING,
        FulfillmentStatus.PACKED,
        FulfillmentStatus.READY_TO_SHIP,
    ],
    AtelierStage.SHIPPED: [
        FulfillmentStatus.HANDED_TO_POST,
        FulfillmentStatus.SHIPPED,
    ],
    AtelierStage.DELIVERED: [
        FulfillmentStatus.DELIVERED,
    ],
}

# Reverse index: operational status -> atelier display stage.
_STATUS_TO_STAGE: dict[FulfillmentStatus, str] = {
    status: stage
    for stage, members in _STAGE_MEMBERS.items()
    for status in members
}


# When the atelier "advances" an order through its coarse view, this is the
# representative operational status each stage is set to. (The fine-grained
# QC/sorting/packing sub-steps are driven by the operations panel; the atelier
# only nudges an order across the coarse boundaries.)
_STAGE_ENTRY_STATUS: dict[str, FulfillmentStatus] = {
    AtelierStage.REGISTERED: FulfillmentStatus.REGISTERED,
    AtelierStage.PRINTING: FulfillmentStatus.PRINTING,
    AtelierStage.PRINTED: FulfillmentStatus.PRINTED,
    AtelierStage.SHIPPED: FulfillmentStatus.SHIPPED,
    AtelierStage.DELIVERED: FulfillmentStatus.DELIVERED,
}

_STAGE_ORDER = [stage for stage, _ in ATELIER_STAGES]


def to_atelier_stage(status: FulfillmentStatus) -> str:
    """Map one operational status to its coarse atelier display stage."""
    return _STATUS_TO_STAGE[status]


def next_atelier_stage(status: FulfillmentStatus) -> str | None:
    """The coarse stage that follows the current one, or None if the order is
    already at the final (delivered) stage."""
    current = to_atelier_stage(status)
    idx = _STAGE_ORDER.index(current)
    if idx >= len(_STAGE_ORDER) - 1:
        return None
    return _STAGE_ORDER[idx + 1]


def entry_status_for_stage(stage: str) -> FulfillmentStatus:
    """The operational status to set when advancing an order into a stage."""
    return _STAGE_ENTRY_STATUS[stage]


def statuses_for_stage(stage: str) -> list[FulfillmentStatus]:
    """All operational statuses that roll up into the given atelier stage.
    Used to translate an atelier filter tab into a DB `IN (...)` filter."""
    if stage not in _STAGE_MEMBERS:
        raise ValueError(f"unknown atelier stage: {stage}")
    return list(_STAGE_MEMBERS[stage])


def is_valid_stage(stage: str) -> bool:
    return stage in _STAGE_MEMBERS


def count_by_stage(statuses: list[FulfillmentStatus]) -> dict[str, int]:
    """Given a flat list of order fulfillment statuses, return a count per
    atelier display stage (every stage present, zero-filled). Powers the
    atelier filter-tab counters (BRD 5.2 #2)."""
    counts = {stage: 0 for stage, _ in ATELIER_STAGES}
    for status in statuses:
        counts[to_atelier_stage(status)] += 1
    return counts


def count_by_status(statuses: list[FulfillmentStatus]) -> dict[str, int]:
    """Count per raw operational status (every status present, zero-filled).
    Powers the operations dashboard cards (BRD 5.3)."""
    counts = {status.value: 0 for status in FulfillmentStatus}
    for status in statuses:
        counts[status.value] += 1
    return counts

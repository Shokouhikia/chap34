"""
Pure mapping between the operational fulfillment lifecycle
(FulfillmentStatus, used by the operations panel) and the 6 display stages
the atelier panel shows its users.

Keeping this in one place means the atelier API, the ops API, and any
counting/dashboard logic all agree on the mapping - it is never duplicated.
"""
from app.models.order import FulfillmentStatus


class AtelierStage(str):
    REGISTERED = "registered"       # ثبت‌شده
    PRINTING = "printing"           # در حال چاپ
    PRINTED = "printed"             # چاپ‌شده
    READY_TO_PACK = "ready_to_pack" # آماده بسته‌بندی
    SHIPPED = "shipped"             # پست‌شده
    DELIVERED = "delivered"         # تحویل


ATELIER_STAGES: list[tuple[str, str]] = [
    (AtelierStage.REGISTERED, "ثبت‌شده"),
    (AtelierStage.PRINTING, "در حال چاپ"),
    (AtelierStage.PRINTED, "چاپ‌شده"),
    (AtelierStage.READY_TO_PACK, "آماده بسته‌بندی"),
    (AtelierStage.SHIPPED, "پست‌شده"),
    (AtelierStage.DELIVERED, "تحویل"),
]


_STAGE_MEMBERS: dict[str, list[FulfillmentStatus]] = {
    AtelierStage.REGISTERED: [FulfillmentStatus.REGISTERED],
    AtelierStage.PRINTING: [FulfillmentStatus.QUEUED, FulfillmentStatus.PRINTING],
    AtelierStage.PRINTED: [FulfillmentStatus.PRINTED],
    AtelierStage.READY_TO_PACK: [FulfillmentStatus.READY_TO_PACK, FulfillmentStatus.PACKING, FulfillmentStatus.PACKED, FulfillmentStatus.READY_TO_SHIP],
    AtelierStage.SHIPPED: [FulfillmentStatus.HANDED_TO_POST, FulfillmentStatus.SHIPPED],
    AtelierStage.DELIVERED: [FulfillmentStatus.DELIVERED],
}

_STATUS_TO_STAGE: dict[FulfillmentStatus, str] = {
    status: stage
    for stage, members in _STAGE_MEMBERS.items()
    for status in members
}

_STAGE_ENTRY_STATUS: dict[str, FulfillmentStatus] = {
    AtelierStage.REGISTERED: FulfillmentStatus.REGISTERED,
    AtelierStage.PRINTING: FulfillmentStatus.PRINTING,
    AtelierStage.PRINTED: FulfillmentStatus.PRINTED,
    AtelierStage.READY_TO_PACK: FulfillmentStatus.READY_TO_PACK,
    AtelierStage.SHIPPED: FulfillmentStatus.SHIPPED,
    AtelierStage.DELIVERED: FulfillmentStatus.DELIVERED,
}

_STAGE_ORDER = [stage for stage, _ in ATELIER_STAGES]


def to_atelier_stage(status: FulfillmentStatus) -> str:
    return _STATUS_TO_STAGE[status]


def next_atelier_stage(status: FulfillmentStatus) -> str | None:
    current = to_atelier_stage(status)
    idx = _STAGE_ORDER.index(current)
    if idx >= len(_STAGE_ORDER) - 1:
        return None
    return _STAGE_ORDER[idx + 1]


def entry_status_for_stage(stage: str) -> FulfillmentStatus:
    return _STAGE_ENTRY_STATUS[stage]


def statuses_for_stage(stage: str) -> list[FulfillmentStatus]:
    if stage not in _STAGE_MEMBERS:
        raise ValueError(f"unknown atelier stage: {stage}")
    return list(_STAGE_MEMBERS[stage])


def is_valid_stage(stage: str) -> bool:
    return stage in _STAGE_MEMBERS


def count_by_stage(statuses: list[FulfillmentStatus]) -> dict[str, int]:
    counts = {stage: 0 for stage, _ in ATELIER_STAGES}
    for status in statuses:
        counts[to_atelier_stage(status)] += 1
    return counts


def count_by_status(statuses: list[FulfillmentStatus]) -> dict[str, int]:
    counts = {status.value: 0 for status in FulfillmentStatus}
    for status in statuses:
        counts[status.value] += 1
    return counts

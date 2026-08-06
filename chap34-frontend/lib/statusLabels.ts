// Persian labels for the 14 operational fulfillment statuses, shared across
// the ops panel screens so they don't drift apart.
export const STATUS_LABELS: Record<string, string> = {
  registered: "ثبت‌شده",
  queued: "در صف چاپ",
  printing: "در حال چاپ",
  printed: "چاپ‌شده",
  qc_pending: "در انتظار کنترل کیفیت",
  qc_rejected: "مردود کیفیت",
  sorting: "در حال تفکیک",
  ready_to_pack: "آماده بسته‌بندی",
  packing: "در حال بسته‌بندی",
  packed: "بسته‌بندی‌شده",
  ready_to_ship: "آماده ارسال",
  handed_to_post: "تحویل به پست",
  shipped: "ارسال‌شده",
  delivered: "تحویل مشتری",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

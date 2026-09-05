// Persian labels for the customer-facing OrderStatus lifecycle (distinct
// from the internal FulfillmentStatus labels in statusLabels.ts). Shared by
// the authenticated /orders/[id]/tracking page and the public /track-order
// page so they never drift apart.
export const ORDER_STATUS_LABELS: Record<string, string> = {
  created: "سفارش ثبت شد",
  paid: "پرداخت موفق",
  preparing: "در حال آماده‌سازی برای چاپ",
  printed: "چاپ شد",
  shipped: "تحویل به شرکت ارسال",
  delivered: "تحویل داده شد",
  cancelled: "لغو شده",
};

export const ORDER_STATUS_SEQUENCE = ["created", "paid", "preparing", "printed", "shipped", "delivered"];

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] || status;
}

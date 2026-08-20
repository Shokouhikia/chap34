// Backs the "سفارشات من" account panel. Field names mirror the real
// `Order`/`Photo` backend models 1:1 (order_code, status, tracking_code,
// result_file_url, ...) since GET /api/photo/mine and GET /api/orders
// return exactly this shape (see chap34-backend/app/api/photos.py and
// orders.py).
import { api, type PaperType, type PrintSize } from "@/lib/api";

export type UserPhoto = {
  id: string;
  result_file_url: string;
  created_at: string;
};

export type OrderStatus =
  | "created"
  | "paid"
  | "preparing"
  | "printed"
  | "shipped"
  | "delivered"
  | "cancelled";

// Same customer-facing vocabulary as /orders/[id]/tracking, plus "cancelled".
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  created: "ثبت شده",
  paid: "پرداخت شده",
  preparing: "در حال آماده‌سازی",
  printed: "چاپ شده",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
};

export type UserOrder = {
  id: string;
  order_code: string;
  status: OrderStatus;
  size: PrintSize;
  paper_type: PaperType;
  quantity: number;
  total_price: number;
  tracking_code: string | null;
  created_at: string;
  photo_url: string | null;
  address: {
    full_name: string;
    province: string;
    city: string;
    full_address: string;
    postal_code: string;
    phone: string;
  } | null;
};

export const userApi = {
  getMyPhotos: (): Promise<UserPhoto[]> => api.getMyPhotos(),
  getMyOrders: (): Promise<UserOrder[]> => api.getMyOrders(),
};

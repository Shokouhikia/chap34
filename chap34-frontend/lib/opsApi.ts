// Operations-panel API client. Same shape as lib/atelierApi.ts but with the
// operator token and the operations endpoints.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TOKEN_KEY = "opsToken";
const NAME_KEY = "opsName";
const ROLE_KEY = "opsRole";

export function getOpsToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setOpsSession(token: string, name: string, role: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(NAME_KEY, name);
  window.localStorage.setItem(ROLE_KEY, role);
}

export function getOpsName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(NAME_KEY);
}

export function getOpsRole(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ROLE_KEY);
}

export function clearOpsSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(NAME_KEY);
  window.localStorage.removeItem(ROLE_KEY);
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  const token = getOpsToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error(
      `اتصال به سرور برقرار نشد. مطمئن شوید بک‌اند روی ${API_URL} در حال اجراست.`
    );
  }
  if (res.status === 401) {
    clearOpsSession();
    if (typeof window !== "undefined") window.location.href = "/ops/login";
    throw new Error("نشست شما منقضی شده است");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `درخواست ناموفق بود (${res.status})`);
  }
  return res.json();
}

async function openFile(path: string) {
  const token = getOpsToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "دریافت فایل ناموفق بود");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export type OrderSummary = {
  id: string;
  order_code: string;
  customer_name: string;
  quantity: number;
  size: string;
  fulfillment_status: string;
  atelier_stage: string;
  tracking_code: string | null;
  batch_id: string | null;
  shipment_id: string | null;
  created_at: string;
};

export const opsApi = {
  login: async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/api/ops/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }).catch(() => {
      throw new Error("اتصال به سرور برقرار نشد");
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || "ورود ناموفق بود");
    }
    const data = await res.json();
    setOpsSession(data.token, data.name, data.role);
    return data as { token: string; name: string; username: string; role: string };
  },

  dashboard: () =>
    request("/api/ops/dashboard") as Promise<{
      cards: { status: string; label: string; count: number }[];
      total: number;
    }>,

  listOrders: (opts: { search?: string; status?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (opts.search) q.set("search", opts.search);
    if (opts.status) q.set("status", opts.status);
    q.set("page", String(opts.page || 1));
    return request(`/api/ops/orders?${q.toString()}`) as Promise<{
      total: number;
      page: number;
      page_size: number;
      orders: OrderSummary[];
    }>;
  },

  createBatch: (order_ids: string[], sheet_size: string) =>
    request("/api/ops/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_ids, sheet_size }),
    }),

  listBatches: () => request("/api/ops/batches"),
  getBatch: (id: string) => request(`/api/ops/batches/${id}`),
  startPrinting: (id: string) =>
    request(`/api/ops/batches/${id}/start-printing`, { method: "POST" }),
  markPrinted: (id: string) =>
    request(`/api/ops/batches/${id}/mark-printed`, { method: "POST" }),
  batchSheets: (id: string, format: "png" | "pdf" = "pdf") =>
    openFile(`/api/ops/batches/${id}/sheets?format=${format}`),

  qcReasons: () => request("/api/ops/qc/reasons"),
  qcPending: () => request("/api/ops/qc/pending"),
  qcApprove: (id: string) =>
    request(`/api/ops/qc/${id}/approve`, { method: "POST" }),
  qcReject: (id: string, reason: string) =>
    request(`/api/ops/qc/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }),

  sortingPending: () => request("/api/ops/sorting/pending"),
  sortingConfirm: (id: string, actual_piece_count: number) =>
    request(`/api/ops/sorting/${id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actual_piece_count }),
    }),

  packingTemplate: () => request("/api/ops/packing/checklist-template"),
  packingPending: () => request("/api/ops/packing/pending"),
  packingStart: (id: string) =>
    request(`/api/ops/packing/${id}/start`, { method: "POST" }),
  packingChecklist: (id: string, checklist: Record<string, boolean>) =>
    request(`/api/ops/packing/${id}/checklist`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklist }),
    }),
  packingConfirm: (id: string) =>
    request(`/api/ops/packing/${id}/confirm`, { method: "POST" }),

  shipmentsPackable: () => request("/api/ops/shipments/packable"),
  createShipment: (order_ids: string[]) =>
    request("/api/ops/shipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_ids }),
    }),
  listShipments: () => request("/api/ops/shipments"),
  getShipment: (id: string) => request(`/api/ops/shipments/${id}`),
  postDeliveryList: (id: string) =>
    openFile(`/api/ops/shipments/${id}/post-delivery-list?format=pdf`),
  shipmentLabels: (id: string) =>
    openFile(`/api/ops/shipments/${id}/labels?format=pdf`),
  handToPost: (id: string) =>
    request(`/api/ops/shipments/${id}/hand-to-post`, { method: "POST" }),
  setTracking: (orderId: string, tracking_code: string) =>
    request(`/api/ops/orders/${orderId}/tracking-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracking_code }),
    }),
  markDelivered: (orderId: string) =>
    request(`/api/ops/orders/${orderId}/mark-delivered`, { method: "POST" }),
  orderLabel: (orderId: string) =>
    openFile(`/api/ops/orders/${orderId}/shipping-label?format=pdf`),
};

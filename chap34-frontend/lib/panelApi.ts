const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TOKEN_KEY = "panelToken";
const NAME_KEY = "panelName";
const ROLE_KEY = "panelRole";

export function getPanelToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setPanelSession(token: string, name: string, role: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(NAME_KEY, name);
  window.localStorage.setItem(ROLE_KEY, role);
}

export function getPanelName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(NAME_KEY);
}

export function getPanelRole(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ROLE_KEY);
}

export function clearPanelSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(NAME_KEY);
  window.localStorage.removeItem(ROLE_KEY);
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  const token = getPanelToken();
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
    clearPanelSession();
    if (typeof window !== "undefined") window.location.href = "/panel/login";
    throw new Error("نشست شما منقضی شده است");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `درخواست ناموفق بود (${res.status})`);
  }
  return res.json();
}

async function openFile(path: string) {
  const token = getPanelToken();
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

async function postForFile(path: string, body: unknown) {
  const token = getPanelToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail || "دریافت فایل ناموفق بود");
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
  /** Finished photo, null when it hasn't been generated yet. */
  photo_url: string | null;
  quantity: number;
  /** The size the customer ordered: "3x4" or "6x8". */
  size: string;
  paper_type: string;
  fulfillment_status: string;
  atelier_stage: string;
  tracking_code: string | null;
  batch_id: string | null;
  batch_code: string | null;
  shipment_id: string | null;
  created_at: string;
};

/** A row of the order report - OrderSummary plus the address/contact fields
 *  the atelier needs for follow-up. */
export type ReportRow = OrderSummary & {
  phone: string;
  account_phone: string;
  province: string;
  city: string;
  full_address: string;
  postal_code: string;
  total_price: number;
};

export type ReportFilters = {
  phone?: string;
  name?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
};

function reportQuery(filters: ReportFilters): URLSearchParams {
  const q = new URLSearchParams();
  if (filters.phone) q.set("phone", filters.phone);
  if (filters.name) q.set("name", filters.name);
  if (filters.status && filters.status !== "all") q.set("status", filters.status);
  if (filters.date_from) q.set("date_from", filters.date_from);
  if (filters.date_to) q.set("date_to", filters.date_to);
  return q;
}

export type Stage = { key: string; label: string; count: number };

export const panelApi = {
  login: async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/api/staff/login`, {
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
    setPanelSession(data.token, data.name, data.role);
    return data as { token: string; name: string; username: string; role: string };
  },

  dashboard: () =>
    request("/api/ops/dashboard") as Promise<{
      cards: { status: string; label: string; count: number }[];
      total: number;
    }>,

  listOrders: (opts: {
    search?: string;
    status?: string;
    page?: number;
    page_size?: number;
    /** Batched orders drop out of the queue by default; pass false to see them. */
    exclude_batched?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (opts.search) q.set("search", opts.search);
    if (opts.status) q.set("status", opts.status);
    q.set("page", String(opts.page || 1));
    if (opts.page_size) q.set("page_size", String(opts.page_size));
    if (opts.exclude_batched === false) q.set("exclude_batched", "false");
    return request(`/api/ops/orders?${q.toString()}`) as Promise<{
      total: number;
      page: number;
      page_size: number;
      orders: OrderSummary[];
    }>;
  },

  /** Full order report with follow-up filters. */
  orderReport: (filters: ReportFilters, page = 1, page_size = 50) => {
    const q = reportQuery(filters);
    q.set("page", String(page));
    q.set("page_size", String(page_size));
    return request(`/api/ops/orders/report?${q.toString()}`) as Promise<{
      total: number;
      page: number;
      page_size: number;
      orders: ReportRow[];
    }>;
  },

  /** Downloads the report as a CSV (UTF-8 with BOM, so Excel reads Persian).
   *  Goes through fetch rather than a plain link so the auth header is sent. */
  orderReportCsv: async (filters: ReportFilters) => {
    const token = getPanelToken();
    const res = await fetch(
      `${API_URL}/api/ops/orders/report.csv?${reportQuery(filters).toString()}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!res.ok) throw new Error("دریافت خروجی اکسل ناموفق بود");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orders-report.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },

  createBatch: (order_ids: string[], sheet_size?: string) =>
    request("/api/ops/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // sheet_size omitted => backend picks the cheapest paper for the print
      // size (6x8 needs A4; on 10x15 only one piece fits per sheet).
      body: JSON.stringify(sheet_size ? { order_ids, sheet_size } : { order_ids }),
    }),

  listBatches: () => request("/api/ops/batches"),
  getBatch: (id: string) => request(`/api/ops/batches/${id}`),
  startPrinting: (id: string) =>
    request(`/api/ops/batches/${id}/start-printing`, { method: "POST" }),
  markPrinted: (id: string) =>
    request(`/api/ops/batches/${id}/mark-printed`, { method: "POST" }),
  batchSheets: (id: string, format: "png" | "pdf" = "pdf") =>
    openFile(`/api/ops/batches/${id}/sheets?format=${format}`),
  /** Labels for every order in the batch, in the same order as the sheets. */
  batchLabels: (id: string) => openFile(`/api/ops/batches/${id}/labels?format=pdf`),

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

  atelierAdvance: (id: string) =>
    request(`/api/atelier/orders/${id}/advance`, { method: "POST" }),
  atelierSetTracking: (id: string, tracking_code: string) =>
    request(`/api/atelier/orders/${id}/tracking-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracking_code }),
    }),
  atelierPrintSheet: (id: string, format: "png" | "pdf", sheet_size: string) =>
    openFile(
      `/api/atelier/orders/${id}/print-sheet?format=${format}&sheet_size=${sheet_size}`
    ),
  atelierShippingLabel: (id: string, format: "png" | "pdf" = "png") =>
    openFile(`/api/atelier/orders/${id}/shipping-label?format=${format}`),
  atelierPrintQueue: (order_ids: string[], sheet_size: string, format: "png" | "pdf") =>
    postForFile("/api/atelier/print-queue/print", {
      order_ids,
      sheet_size,
      format,
    }),

  atelierChangePassword: (old_password: string, new_password: string) =>
    request("/api/staff/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ old_password, new_password }),
    }),

  getDashboard: () => request("/api/admin/dashboard"),
  listAllOrders: (status?: string) => {
    const url = status ? `/api/admin/orders?status=${status}` : "/api/admin/orders";
    return request(url);
  },
  getAdminOrderDetail: (orderId: string) => request(`/api/admin/orders/${orderId}`),
  updateOrderStatus: (orderId: string, body: { status: string; note?: string; tracking_code?: string }) =>
    request(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  listCustomers: () => request("/api/admin/customers"),
  getCustomerDetail: (userId: string) => request(`/api/admin/customers/${userId}`),
  getAdminSettings: () => request("/api/admin/settings"),
  updateAdminSettings: (body: Record<string, string>) =>
    request("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  listAtelierAccounts: () =>
    request("/api/admin/atelier-accounts") as Promise<
      {
        id: string;
        username: string;
        name: string;
        is_active: boolean;
        created_at: string;
        provinces: string[];
      }[]
    >,
  /** provinces omitted/empty = unrestricted (sees every province's orders). */
  createAtelierAccount: (name: string, username: string, password: string, provinces?: string[]) =>
    request("/api/admin/atelier-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, password, provinces: provinces?.length ? provinces : null }),
    }),
  updateAtelierAccount: (
    id: string,
    body: {
      name?: string;
      username?: string;
      password?: string;
      is_active?: boolean;
      /** Pass to change province access; omit to leave it untouched, [] to clear to unrestricted. */
      provinces?: string[];
    }
  ) =>
    request(`/api/admin/atelier-accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        body.provinces !== undefined
          ? { ...body, provinces_set: true }
          : body
      ),
    }),
  deactivateAtelierAccount: (id: string) =>
    request(`/api/admin/atelier-accounts/${id}`, { method: "DELETE" }),
  listDiscountCodes: () => request("/api/admin/discount-codes"),
  createDiscountCode: (code: string, percent: number, max_uses_per_user?: number | null) =>
    request("/api/admin/discount-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, percent, max_uses_per_user: max_uses_per_user ?? null }),
    }),
  updateDiscountCodeLimit: (id: string, max_uses_per_user: number | null) =>
    request(`/api/admin/discount-codes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ max_uses_per_user, max_uses_per_user_set: true }),
    }),
  toggleDiscountCode: (id: string) =>
    request(`/api/admin/discount-codes/${id}/toggle`, { method: "PATCH" }),
  getDiscountCodeUsage: (id: string) =>
    request(`/api/admin/discount-codes/${id}/usage`) as Promise<{
      code: string;
      total_uses: number;
      by_user: { phone: string; count: number }[];
    }>,

  fileUrl(path: string) {
    return `${API_URL}${path}`;
  },
};

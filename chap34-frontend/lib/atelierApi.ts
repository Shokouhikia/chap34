// Atelier-panel API client. Mirrors the fetch-wrapper shape of lib/api.ts,
// but authenticates with the atelier's own signed JWT (stored separately
// from the customer token) and adds helpers for downloading the print
// sheets / labels, which come back as binary (PNG/PDF), not JSON.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TOKEN_KEY = "atelierToken";
const NAME_KEY = "atelierName";

export function getAtelierToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAtelierSession(token: string, name: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(NAME_KEY, name);
}

export function getAtelierName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(NAME_KEY);
}

export function clearAtelierSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(NAME_KEY);
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  const token = getAtelierToken();
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
    clearAtelierSession();
    if (typeof window !== "undefined") window.location.href = "/atelier/login";
    throw new Error("نشست شما منقضی شده است");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `درخواست ناموفق بود (${res.status})`);
  }
  return res.json();
}

// Fetch a binary printable with auth and open it in a new tab.
async function openFile(path: string) {
  const token = getAtelierToken();
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
  const token = getAtelierToken();
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

export type Stage = { key: string; label: string; count: number };
export type OrderSummary = {
  id: string;
  order_code: string;
  customer_name: string;
  quantity: number;
  size: string;
  fulfillment_status: string;
  atelier_stage: string;
  tracking_code: string | null;
  created_at: string;
};

export const atelierApi = {
  login: async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/api/atelier/login`, {
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
    setAtelierSession(data.token, data.name);
    return data as { token: string; name: string; username: string };
  },

  changePassword: (old_password: string, new_password: string) =>
    request("/api/atelier/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ old_password, new_password }),
    }),

  listOrders: (stage: string, page = 1) =>
    request(
      `/api/atelier/orders?stage=${encodeURIComponent(stage)}&page=${page}`
    ) as Promise<{
      stages: Stage[];
      total: number;
      page: number;
      page_size: number;
      orders: OrderSummary[];
    }>,

  getOrder: (id: string) => request(`/api/atelier/orders/${id}`),

  advance: (id: string) =>
    request(`/api/atelier/orders/${id}/advance`, { method: "POST" }),

  setTracking: (id: string, tracking_code: string) =>
    request(`/api/atelier/orders/${id}/tracking-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracking_code }),
    }),

  printSheet: (id: string, format: "png" | "pdf", sheet_size: string) =>
    openFile(
      `/api/atelier/orders/${id}/print-sheet?format=${format}&sheet_size=${sheet_size}`
    ),

  shippingLabel: (id: string, format: "png" | "pdf" = "png") =>
    openFile(`/api/atelier/orders/${id}/shipping-label?format=${format}`),

  printQueue: (order_ids: string[], sheet_size: string, format: "png" | "pdf") =>
    postForFile("/api/atelier/print-queue/print", {
      order_ids,
      sheet_size,
      format,
    }),
};

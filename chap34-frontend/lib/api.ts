const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("sessionToken");
}

function setSessionToken(token: string) {
  window.localStorage.setItem("sessionToken", token);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("accessToken");
}

function setAccessToken(token: string) {
  window.localStorage.setItem("accessToken", token);
}

export function clearAccessToken() {
  window.localStorage.removeItem("accessToken");
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}

// Backup for the "?redirect=" query param that carries the destination
// through /login -> /login/otp -> back. A query param can get dropped if
// the user backgrounds the browser mid-flow (mobile browsers sometimes
// reload a backgrounded tab from a bare URL) or otherwise re-lands on
// /login without it; sessionStorage survives that so login still lands
// back where the user was trying to go instead of silently falling back
// to the homepage.
const PENDING_REDIRECT_KEY = "postLoginRedirect";

export function savePendingRedirect(path: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_REDIRECT_KEY, path);
}

export function getPendingRedirect(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(PENDING_REDIRECT_KEY);
}

export function clearPendingRedirect() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_REDIRECT_KEY);
}

// Render's free tier spins the backend down after ~15min idle, and a cold
// boot can take 30-50s (not the few seconds a single short retry assumed).
// A request that fails at the network level (TypeError, not a real HTTP
// error) during that window is retried repeatedly with a fixed delay until
// this budget is used up, instead of giving up after one 5s-delayed retry
// and surfacing a hard "server unreachable" error while the container is
// still just booting.
const COLD_START_RETRY_DELAY_MS = 4000;
const COLD_START_MAX_RETRIES = 11; // ~44s of retrying on top of the first attempt

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (!(err instanceof TypeError) || attempt >= COLD_START_MAX_RETRIES) throw err;
      await new Promise((resolve) => setTimeout(resolve, COLD_START_RETRY_DELAY_MS));
    }
  }
}

/**
 * FastAPI's error `detail` is a string for HTTPException but a LIST of
 * {loc, msg, type} objects for 422 validation errors. Passing that list
 * straight to `new Error()` stringifies it to "[object Object]", which is
 * what users were seeing instead of a real message.
 */
function errorMessage(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((e) => (e && typeof e === "object" ? (e as { msg?: unknown }).msg : e))
      .filter((m): m is string => typeof m === "string" && m.length > 0);
    if (parts.length) return parts.join("، ");
  }
  return fallback;
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  const sessionToken = getSessionToken();
  if (sessionToken) headers["X-Session-Token"] = sessionToken;

  const accessToken = getAccessToken();
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  try {
    const res = await fetchWithRetry(`${API_URL}${path}`, { ...options, headers });
    if (res.status === 401 && accessToken) {
      // Customer JWTs expire after 12h (see security.py) - a stale token
      // left in localStorage would otherwise fail silently forever.
      clearAccessToken();
      if (typeof window !== "undefined") {
        window.location.href = `/login?redirect=${encodeURIComponent(
          window.location.pathname + window.location.search
        )}`;
      }
      throw new Error("نشست شما منقضی شده است، دوباره وارد شوید");
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(errorMessage(body, `درخواست ناموفق بود (${res.status})`));
    }
    return res.json();
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        "اتصال به سرور برقرار نشد. مطمئن شوید بک‌اند روی " +
          API_URL +
          " در حال اجراست."
      );
    }
    throw err;
  }
}

export type Gender = "male" | "female";
export type PrintSize = "3x4" | "6x8";
export type PaperType = "glossy" | "matte";

export const api = {
  uploadPhoto: async (
    file: File | Blob,
    clientGender?: Gender,
    clientGenderConfidence?: number
  ) => {
    const form = new FormData();
    form.append("file", file, file instanceof File ? file.name : "photo.jpg");
    if (clientGender) form.append("client_gender", clientGender);
    if (clientGenderConfidence !== undefined) {
      form.append("client_gender_confidence", String(clientGenderConfidence));
    }
    const headers: Record<string, string> = {};
    const sessionToken = getSessionToken();
    if (sessionToken) headers["X-Session-Token"] = sessionToken;
    const accessToken = getAccessToken();
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    try {
      const res = await fetchWithRetry(`${API_URL}/api/photo/upload`, {
        method: "POST",
        body: form,
        headers,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(errorMessage(body, `آپلود عکس ناموفق بود (${res.status})`));
      }
      const data = await res.json();
      setSessionToken(data.session_token);
      return data as { photo_id: string; session_token: string; url: string };
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error(
          "اتصال به سرور برقرار نشد. مطمئن شوید بک‌اند روی " +
            API_URL +
            " در حال اجراست."
        );
      }
      throw err;
    }
  },

  detectGender: (photoId: string) =>
    request(`/api/photo/${photoId}/detect-gender`, { method: "POST" }) as Promise<{
      photo_id: string;
      gender: Gender;
      confidence: number;
    }>,

  generatePhoto: (
    photoId: string,
    body: { gender: Gender; outfit_type: string; background_color: string }
  ) =>
    request(`/api/photo/${photoId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as Promise<{ photo_id: string; status: string; result_photo_url: string }>,

  getPhoto: (photoId: string) => request(`/api/photo/${photoId}`),

  getMyPhotos: () => request("/api/photo/mine"),

  getMyOrders: () => request("/api/orders"),

  requestOtp: (phone: string) =>
    request("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: async (phone: string, code: string) => {
    const data = await request("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        code,
        session_token: getSessionToken(),
      }),
    });
    setAccessToken(data.token);
    return data;
  },

  getPricing: () =>
    request("/api/print/pricing") as Promise<{
      currency: string;
      combinations: {
        quantity: number;
        size: PrintSize;
        paper_type: PaperType;
        price: number;
      }[];
    }>,

  createOrder: (body: {
    photo_id: string;
    size: PrintSize;
    quantity: number;
    paper_type: PaperType;
    address: {
      full_name: string;
      province: string;
      city: string;
      full_address: string;
      postal_code: string;
      phone: string;
    };
    discount_code?: string | null;
  }) =>
    request("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as Promise<{ order_id: string; amount_due: number; print_amount: number; shipping_cost: number; discount_amount: number; discount_percent: number | null; discount_code: string | null }>,

  initPayment: (orderId: string) =>
    request(`/api/payment/init?order_id=${orderId}`, { method: "POST" }) as Promise<{
      payment_id: string;
      gateway_redirect_url: string;
    }>,

  confirmPayment: (paymentId: string) =>
    request(`/api/payment/callback?payment_id=${paymentId}`, { method: "POST" }),

  advanceOrder: (orderId: string) =>
    request(`/api/orders/${orderId}/advance`, { method: "POST" }),

  getTracking: (orderId: string) => request(`/api/orders/${orderId}/status`),

  fileUrl: (path: string) => `${API_URL}${path}`,
};

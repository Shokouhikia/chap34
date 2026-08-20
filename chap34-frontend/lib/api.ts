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

// Render's free tier spins the backend down after ~15min idle; the first
// request after that can fail at the network level (TypeError, not a real
// HTTP error) while the container wakes up. One retry after a short wait
// covers that case instead of surfacing a hard "server unreachable" error.
const COLD_START_RETRY_DELAY_MS = 5000;

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (err) {
    if (!(err instanceof TypeError)) throw err;
    await new Promise((resolve) => setTimeout(resolve, COLD_START_RETRY_DELAY_MS));
    return fetch(url, options);
  }
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
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
      throw new Error("نشست شما منقضی شده است، دوباره وارد شوید");
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `درخواست ناموفق بود (${res.status})`);
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

    try {
      const res = await fetchWithRetry(`${API_URL}/api/photo/upload`, {
        method: "POST",
        body: form,
        headers,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `آپلود عکس ناموفق بود (${res.status})`);
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

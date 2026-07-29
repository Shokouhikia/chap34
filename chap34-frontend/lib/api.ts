const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("sessionToken");
}

function setSessionToken(token: string) {
  window.localStorage.setItem("sessionToken", token);
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("accessToken");
}

function setAccessToken(token: string) {
  window.localStorage.setItem("accessToken", token);
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  const sessionToken = getSessionToken();
  if (sessionToken) headers["X-Session-Token"] = sessionToken;

  const accessToken = getAccessToken();
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `درخواست ناموفق بود (${res.status})`);
  }
  return res.json();
}

export type Gender = "male" | "female";
export type PrintSize = "3x4" | "6x8";
export type PaperType = "glossy" | "matte";

export const api = {
  uploadPhoto: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const headers: Record<string, string> = {};
    const sessionToken = getSessionToken();
    if (sessionToken) headers["X-Session-Token"] = sessionToken;

    const res = await fetch(`${API_URL}/api/photo/upload`, {
      method: "POST",
      body: form,
      headers,
    });
    if (!res.ok) throw new Error("آپلود عکس ناموفق بود");
    const data = await res.json();
    setSessionToken(data.session_token);
    return data as { photo_id: string; session_token: string; url: string };
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
  }) =>
    request("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as Promise<{ order_id: string; amount_due: number }>,

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

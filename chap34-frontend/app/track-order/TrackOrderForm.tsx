"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { ORDER_STATUS_LABELS, ORDER_STATUS_SEQUENCE } from "@/lib/orderStatusLabels";

const SIZE_LABEL: Record<string, string> = { "3x4": "۳×۴", "6x8": "۶×۸" };
const PAPER_LABEL: Record<string, string> = { glossy: "چاپ براق (گلاسه)", matte: "چاپ مات" };

type TrackResult = Awaited<ReturnType<typeof api.trackOrder>>;

export default function TrackOrderForm() {
  const [orderCode, setOrderCode] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);

  async function submit() {
    if (!orderCode.trim() || !phone.trim()) {
      setError("شماره سفارش و شماره تماس الزامی است");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.trackOrder(orderCode.trim(), phone.trim());
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در پیگیری سفارش");
    } finally {
      setLoading(false);
    }
  }

  const doneStatuses = new Set(result?.history.map((h) => h.status) || []);

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-1 text-center text-xl font-extrabold text-navy">پیگیری سفارش</h1>
      <p className="mb-6 text-center text-xs text-muted">
        شماره سفارش و شماره تماسی که هنگام ثبت سفارش وارد کرده‌اید را وارد کنید.
      </p>

      <label className="field-label">شماره سفارش</label>
      <input
        value={orderCode}
        onChange={(e) => setOrderCode(e.target.value)}
        placeholder="ORD-000123"
        className="field-input mb-3"
        dir="ltr"
      />

      <label className="field-label">شماره تماس</label>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="09121234567"
        className="field-input mb-4"
        dir="ltr"
      />

      {error && <p className="mb-3 text-sm font-bold text-red-500">{error}</p>}

      <button onClick={submit} disabled={loading} className="btn-primary w-full">
        {loading ? "در حال جست‌وجو..." : "پیگیری سفارش"}
      </button>

      {result && (
        <div className="mt-8">
          <div className="price-box mb-6">
            <div className="price-row">
              <span>شماره سفارش</span>
              <span dir="ltr">{result.order_code}</span>
            </div>
            <div className="price-row">
              <span>سایز</span>
              <span>{SIZE_LABEL[result.size] || result.size}</span>
            </div>
            <div className="price-row">
              <span>نوع کاغذ</span>
              <span>{PAPER_LABEL[result.paper_type] || result.paper_type}</span>
            </div>
            <div className="price-row">
              <span>تعداد</span>
              <span>{result.quantity.toLocaleString("fa-IR")} قطعه</span>
            </div>
            {result.tracking_code && (
              <div className="price-row">
                <span>کد رهگیری پستی</span>
                <span dir="ltr">{result.tracking_code}</span>
              </div>
            )}
          </div>

          <div className="relative space-y-6 border-r-2 border-line pr-4">
            {ORDER_STATUS_SEQUENCE.map((status) => {
              const done = doneStatuses.has(status);
              const current = result.status === status;
              return (
                <div key={status} className="relative">
                  <span
                    className={`absolute -right-[22px] top-0.5 h-4 w-4 rounded-full ring-4 ring-[#faf9fc] ${
                      current ? "bg-purple" : done ? "bg-success" : "bg-line"
                    }`}
                  />
                  <b className={`block text-sm ${done || current ? "text-navy" : "text-muted"}`}>
                    {ORDER_STATUS_LABELS[status]}
                  </b>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

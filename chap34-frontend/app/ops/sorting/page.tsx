"use client";

import { useEffect, useState } from "react";
import { opsApi, OrderSummary } from "@/lib/opsApi";

export default function OpsSortingPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await opsApi.sortingPending();
      setOrders(data.orders);
      // Pre-fill each input with the expected quantity as a starting point.
      const init: Record<string, number> = {};
      data.orders.forEach((o: OrderSummary) => (init[o.id] = o.quantity));
      setCounts(init);
      setErrors({});
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function confirm(o: OrderSummary) {
    setErrors((e) => ({ ...e, [o.id]: "" }));
    try {
      await opsApi.sortingConfirm(o.id, counts[o.id]);
      await load();
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [o.id]: err instanceof Error ? err.message : "خطا",
      }));
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-extrabold text-navy">تفکیک سفارش‌ها</h1>

      {globalError && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {globalError}
        </div>
      )}

      <div className="space-y-3">
        {orders.map((o) => {
          const mismatch = counts[o.id] !== o.quantity;
          return (
            <div key={o.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-bold text-navy" dir="ltr">
                    {o.order_code}
                  </span>
                  <span className="text-muted">{o.customer_name}</span>
                  <span className="rounded-full bg-purple-tint px-2 py-1 text-xs font-bold text-purple-deep">
                    انتظار: {o.quantity} قطعه
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-muted">شمارش واقعی</label>
                  <input
                    type="number"
                    value={counts[o.id] ?? ""}
                    onChange={(e) =>
                      setCounts((c) => ({
                        ...c,
                        [o.id]: Number(e.target.value),
                      }))
                    }
                    className="field-input w-24 py-2 text-center"
                    dir="ltr"
                  />
                  <button
                    onClick={() => confirm(o)}
                    disabled={mismatch}
                    className="btn-primary py-2 text-sm disabled:opacity-40"
                  >
                    تأیید
                  </button>
                </div>
              </div>
              {mismatch && (
                <p className="mt-2 text-xs font-bold text-red-500">
                  مغایرت تعداد: تا رفع مغایرت امکان تأیید نیست.
                </p>
              )}
              {errors[o.id] && (
                <p className="mt-2 text-xs font-bold text-red-500">{errors[o.id]}</p>
              )}
            </div>
          );
        })}
        {orders.length === 0 && !loading && (
          <p className="text-sm text-muted">سفارشی برای تفکیک وجود ندارد.</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { opsApi, OrderSummary } from "@/lib/opsApi";

type Group = { batch_id: string; orders: OrderSummary[] };
type Reason = { key: string; label: string };

export default function OpsQCPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reject modal state.
  const [rejectFor, setRejectFor] = useState<OrderSummary | null>(null);
  const [reason, setReason] = useState("low_quality");

  async function load() {
    setLoading(true);
    try {
      const [pending, r] = await Promise.all([
        opsApi.qcPending(),
        opsApi.qcReasons(),
      ]);
      setGroups(pending.groups);
      setTotal(pending.total);
      setReasons(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    setError(null);
    try {
      await opsApi.qcApprove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    }
  }

  async function doReject() {
    if (!rejectFor) return;
    setError(null);
    try {
      await opsApi.qcReject(rejectFor.id, reason);
      setRejectFor(null);
      setReason("low_quality");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-navy">کنترل کیفیت</h1>
        <span className="text-sm text-muted">در انتظار: {total}</span>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      {groups.map((g) => (
        <div key={g.batch_id} className="card mb-4">
          <div className="mb-3 text-sm font-bold text-navy" dir="ltr">
            بچ: {g.batch_id === "unbatched" ? "بدون بچ" : g.batch_id.slice(0, 8)}
          </div>
          <div className="space-y-2">
            {g.orders.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-3 py-2"
              >
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-bold text-navy" dir="ltr">
                    {o.order_code}
                  </span>
                  <span className="text-muted">{o.customer_name}</span>
                  <span className="text-xs text-muted">{o.quantity} قطعه</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approve(o.id)}
                    className="rounded-lg bg-success px-3 py-1.5 text-xs font-bold text-white"
                  >
                    تأیید
                  </button>
                  <button
                    onClick={() => setRejectFor(o)}
                    className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    رد
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {groups.length === 0 && !loading && (
        <p className="text-sm text-muted">سفارشی در انتظار کنترل کیفیت نیست.</p>
      )}

      {rejectFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setRejectFor(null)}
        >
          <div className="card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-lg font-extrabold text-navy">
              رد سفارش {rejectFor.order_code}
            </h3>
            <p className="mb-4 text-sm text-muted">
              سفارش برای چاپ مجدد به صف چاپ بازمی‌گردد.
            </p>
            <label className="mb-1 block text-sm font-bold text-navy">دلیل رد</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="field-input mb-5"
            >
              {reasons.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
            <button onClick={doReject} className="btn-primary w-full">
              ثبت رد و بازگشت به صف چاپ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

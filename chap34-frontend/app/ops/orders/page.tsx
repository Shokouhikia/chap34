"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { opsApi, OrderSummary } from "@/lib/opsApi";
import { STATUS_LABELS, statusLabel } from "@/lib/statusLabels";

// Orders that can be put into a new print batch (fresh or QC-rejected reprints).
const BATCHABLE = new Set(["registered", "qc_rejected"]);

function OpsOrdersInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialStatus = params.get("status") || "all";

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sheetSize, setSheetSize] = useState("10x15");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await opsApi.listOrders({
        search: search.trim() || undefined,
        status: status === "all" ? undefined : status,
      });
      setOrders(data.orders);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت سفارش‌ها");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const batchable = orders.filter((o) => BATCHABLE.has(o.fulfillment_status));

  function toggle(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === batchable.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(batchable.map((o) => o.id)));
    }
  }

  async function createBatch() {
    try {
      const res = await opsApi.createBatch(Array.from(selected), sheetSize);
      setNotice(`بچ ${res.code} با ${res.order_count} سفارش ساخته شد`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ساخت بچ");
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-extrabold text-navy">سفارش‌ها</h1>

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-bold text-muted">
            جست‌وجو (کد سفارش / نام مشتری)
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="field-input"
            placeholder="ORD-000101 یا نام مشتری"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-muted">وضعیت</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="field-input w-auto"
          >
            <option value="all">همه</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <button onClick={load} className="btn-outline py-3">
          جست‌وجو
        </button>
      </div>

      {/* Batch creation bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-purple-tint px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleAll}
            disabled={batchable.length === 0}
            className="text-sm font-bold text-purple-deep disabled:opacity-40"
          >
            {selected.size === batchable.length && batchable.length > 0
              ? "لغو انتخاب همه"
              : "انتخاب همه قابل‌چاپ"}
          </button>
          <span className="text-xs text-muted">
            {selected.size} انتخاب‌شده از {batchable.length} سفارش قابل‌چاپ
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sheetSize}
            onChange={(e) => setSheetSize(e.target.value)}
            className="field-input w-auto py-2"
          >
            <option value="10x15">شیت ۱۰×۱۵</option>
            <option value="a4">شیت A4</option>
          </select>
          <button
            onClick={createBatch}
            disabled={selected.size === 0}
            className="btn-primary py-2 text-sm disabled:opacity-40"
          >
            ایجاد بچ چاپ
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-bold text-success">
          {notice}
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-right text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="p-3"></th>
              <th className="p-3">کد سفارش</th>
              <th className="p-3">مشتری</th>
              <th className="p-3">تعداد</th>
              <th className="p-3">وضعیت</th>
              <th className="p-3">تاریخ</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const canBatch = BATCHABLE.has(o.fulfillment_status);
              return (
                <tr key={o.id} className="border-b border-line/60 hover:bg-purple-tint/40">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      disabled={!canBatch}
                      checked={selected.has(o.id)}
                      onChange={() => toggle(o.id)}
                    />
                  </td>
                  <td className="p-3 font-bold text-navy" dir="ltr">
                    {o.order_code}
                  </td>
                  <td className="p-3">{o.customer_name}</td>
                  <td className="p-3">{o.quantity}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-purple-tint px-2 py-1 text-xs font-bold text-purple-deep">
                      {statusLabel(o.fulfillment_status)}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted" dir="ltr">
                    {new Date(o.created_at).toLocaleDateString("fa-IR")}
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm text-muted">
                  سفارشی یافت نشد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function OpsOrdersPage() {
  return (
    <Suspense fallback={null}>
      <OpsOrdersInner />
    </Suspense>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { panelApi, OrderSummary, Stage } from "@/lib/panelApi";
import OrderPhotoThumb from "@/components/OrderPhotoThumb";
import { statusLabel } from "@/lib/statusLabels";

const PRINT_SIZE_LABEL: Record<string, string> = {
  "3x4": "۳×۴",
  "6x8": "۶×۸",
};

const PAPER_LABEL: Record<string, string> = {
  glossy: "گلاسه",
  matte: "مات",
};

function faDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fa-IR");
  } catch {
    return iso.slice(0, 10);
  }
}

export default function AtelierOrdersPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [activeStage, setActiveStage] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sheetSize, setSheetSize] = useState("10x15");
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Orders that are already in a print batch have moved on to the batches
  // screen, so they're hidden here by default. The toggle keeps the
  // per-order actions (label, sheet, advance) reachable for later stages.
  const [showProcessed, setShowProcessed] = useState(false);

  const [trackingFor, setTrackingFor] = useState<OrderSummary | null>(null);
  const [trackingCode, setTrackingCode] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await panelApi.listOrders({
        status: activeStage === "all" ? undefined : activeStage,
        page: 1,
        exclude_batched: !showProcessed,
      });
      setStages([]);
      setOrders(data.orders);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت سفارش‌ها");
    } finally {
      setLoading(false);
    }
  }, [activeStage, showProcessed]);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function advance(order: OrderSummary) {
    try {
      await panelApi.atelierAdvance(order.id);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا";
      if (msg.includes("کد رهگیری")) {
        setTrackingFor(order);
        setTrackingCode(order.tracking_code || "");
      } else {
        setError(msg);
      }
    }
  }

  async function saveTracking() {
    if (!trackingFor) return;
    try {
      await panelApi.atelierSetTracking(trackingFor.id, trackingCode);
      const toAdvance = trackingFor;
      setTrackingFor(null);
      setTrackingCode("");
      await panelApi.atelierAdvance(toAdvance.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ثبت کد رهگیری");
    }
  }

  async function printSelected(format: "png" | "pdf") {
    try {
      await panelApi.atelierPrintQueue(Array.from(selected), sheetSize, format);
      setShowQueueModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در چاپ گروهی");
    }
  }

  /** Orders eligible for a new print batch (the backend only accepts
   *  `registered` ones, and requires them to share size + paper type). */
  const selectable = orders.filter((o) => o.fulfillment_status === "registered");

  function toggleAllSelectable() {
    if (selected.size === selectable.length && selectable.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectable.map((o) => o.id)));
    }
  }

  async function createBatch() {
    setError(null);
    setCreating(true);
    try {
      // Sheet size is deliberately not sent: the backend picks the cheapest
      // paper for the print size (6x8 fits 1 piece on 10x15 vs 9 on A4).
      const batch = await panelApi.createBatch(Array.from(selected));
      setNotice(`بچ ${batch.code} با ${batch.order_count} سفارش ساخته شد.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ساخت بچ چاپ");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-extrabold text-navy">سفارش‌های آتلیه</h1>
          <p className="mt-0.5 text-xs text-muted">
            {showProcessed
              ? "همه‌ی سفارش‌ها، قدیمی‌ترین ابتدا."
              : "سفارش‌های پردازش‌نشده، قدیمی‌ترین ابتدا."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-[13px] font-bold text-navy">
            <input
              type="checkbox"
              checked={showProcessed}
              onChange={(e) => setShowProcessed(e.target.checked)}
            />
            نمایش پردازش‌شده‌ها
          </label>
          <button
            disabled={selected.size === 0 || creating}
            onClick={createBatch}
            className="rounded-lg bg-purple px-3.5 py-2 text-[13px] font-bold text-white transition hover:bg-purple-deep disabled:opacity-40"
          >
            {creating ? "در حال ساخت..." : `ایجاد بچ چاپ (${selected.size})`}
          </button>
          <select
            value={sheetSize}
            onChange={(e) => setSheetSize(e.target.value)}
            className="field-input w-auto py-1.5 text-[13px]"
          >
            <option value="10x15">شیت ۱۰×۱۵</option>
            <option value="a4">شیت A4</option>
          </select>
          <button
            disabled={selected.size === 0}
            onClick={() => setShowQueueModal(true)}
            className="rounded-lg border border-line bg-white px-3.5 py-2 text-[13px] font-bold text-navy disabled:opacity-40"
          >
            چاپ مستقیم ({selected.size})
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveStage("all")}
          className={`rounded-full px-4 py-2 text-sm font-bold transition ${
            activeStage === "all" ? "bg-purple text-white" : "border border-line bg-white text-navy hover:border-purple"
          }`}
        >
          همه
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-bold text-red-600">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-3 rounded-xl bg-green-50 px-4 py-2.5 text-[13px] font-bold text-green-600">
          {notice}
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="table-panel min-w-[900px]">
          <thead>
            <tr>
              <th className="w-8">
                <input
                  type="checkbox"
                  checked={selectable.length > 0 && selected.size === selectable.length}
                  onChange={toggleAllSelectable}
                  title="انتخاب همه‌ی سفارش‌های ثبت‌شده"
                />
              </th>
              <th>عکس</th>
              <th>کد سفارش</th>
              <th>تاریخ</th>
              <th>مشتری</th>
              <th>سایز</th>
              <th>کاغذ</th>
              <th>تعداد</th>
              <th>وضعیت</th>
              <th>کد رهگیری</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(o.id)}
                    onChange={() => toggle(o.id)}
                  />
                </td>
                <td>
                  <OrderPhotoThumb photoUrl={o.photo_url} alt={o.customer_name} />
                </td>
                <td className="font-bold text-navy font-mono2" dir="ltr">
                  {o.order_code}
                </td>
                <td className="whitespace-nowrap text-xs text-muted">
                  {faDate(o.created_at)}
                </td>
                <td>{o.customer_name}</td>
                <td className="whitespace-nowrap font-bold">
                  {PRINT_SIZE_LABEL[o.size] || o.size}
                </td>
                <td className="whitespace-nowrap text-xs">
                  {PAPER_LABEL[o.paper_type] || o.paper_type || "—"}
                </td>
                <td className="font-mono2">{o.quantity}</td>
                <td>
                  <span className="pill-status">{statusLabel(o.fulfillment_status)}</span>
                </td>
                <td className="font-mono2 text-xs text-muted" dir="ltr">
                  {o.tracking_code || "—"}
                </td>
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => advance(o)}
                      disabled={o.fulfillment_status === "delivered"}
                      className="rounded-lg bg-navy px-2.5 py-1 text-xs font-bold text-white disabled:opacity-30"
                    >
                      پیشبرد
                    </button>
                    <button
                      onClick={() =>
                        panelApi.atelierPrintSheet(o.id, "pdf", sheetSize).catch((e) =>
                          setError(e.message)
                        )
                      }
                      className="rounded-lg border border-line px-2.5 py-1 text-xs font-bold text-navy"
                    >
                      شیت چاپ
                    </button>
                    <button
                      onClick={() =>
                        panelApi.atelierShippingLabel(o.id, "pdf").catch((e) => setError(e.message))
                      }
                      className="rounded-lg border border-line px-2.5 py-1 text-xs font-bold text-navy"
                    >
                      برچسب
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && !loading && (
              <tr>
                <td colSpan={11} className="p-8 text-center text-sm text-muted">
                  سفارشی در این مرحله وجود ندارد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showQueueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowQueueModal(false)}>
          <div className="card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-extrabold text-navy">
              چاپ گروهی {selected.size} سفارش
            </h3>
            <label className="mb-1 block text-sm font-bold text-navy">سایز شیت</label>
            <select
              value={sheetSize}
              onChange={(e) => setSheetSize(e.target.value)}
              className="field-input mb-5"
            >
              <option value="10x15">۱۰×۱۵ سانتی‌متر</option>
              <option value="a4">A4</option>
            </select>
            <div className="flex gap-3">
              <button onClick={() => printSelected("pdf")} className="btn-primary flex-1">دانلود PDF</button>
              <button onClick={() => printSelected("png")} className="btn-outline flex-1">دانلود PNG</button>
            </div>
          </div>
        </div>
      )}

      {trackingFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setTrackingFor(null)}>
          <div className="card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-lg font-extrabold text-navy">ثبت کد رهگیری</h3>
            <p className="mb-4 text-sm text-muted">
              برای پست کردن سفارش {trackingFor.order_code} ابتدا کد رهگیری پستی را وارد کنید.
            </p>
            <input
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              className="field-input mb-5"
              placeholder="مثلاً IR1234567890"
              dir="ltr"
            />
            <button
              onClick={saveTracking}
              disabled={!trackingCode.trim()}
              className="btn-primary w-full disabled:opacity-40"
            >
              ثبت و پست کردن
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

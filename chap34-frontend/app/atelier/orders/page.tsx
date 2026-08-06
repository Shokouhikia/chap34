"use client";

import { useCallback, useEffect, useState } from "react";
import {
  atelierApi,
  OrderSummary,
  Stage,
} from "@/lib/atelierApi";

const STATUS_LABELS: Record<string, string> = {
  registered: "ثبت‌شده",
  queued: "در صف چاپ",
  printing: "در حال چاپ",
  printed: "چاپ‌شده",
  qc_pending: "در انتظار کنترل کیفیت",
  qc_rejected: "مردود کیفیت",
  sorting: "در حال تفکیک",
  ready_to_pack: "آماده بسته‌بندی",
  packing: "در حال بسته‌بندی",
  packed: "بسته‌بندی‌شده",
  ready_to_ship: "آماده ارسال",
  handed_to_post: "تحویل به پست",
  shipped: "ارسال‌شده",
  delivered: "تحویل مشتری",
};

export default function AtelierOrdersPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [activeStage, setActiveStage] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sheetSize, setSheetSize] = useState("10x15");
  const [showQueueModal, setShowQueueModal] = useState(false);

  // Tracking modal state (opened when advancing into "shipped" is blocked).
  const [trackingFor, setTrackingFor] = useState<OrderSummary | null>(null);
  const [trackingCode, setTrackingCode] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await atelierApi.listOrders(activeStage);
      setStages(data.stages);
      setOrders(data.orders);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت سفارش‌ها");
    } finally {
      setLoading(false);
    }
  }, [activeStage]);

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
      await atelierApi.advance(order.id);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا";
      // Advancing into "shipped" needs a tracking code first.
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
      await atelierApi.setTracking(trackingFor.id, trackingCode);
      const toAdvance = trackingFor;
      setTrackingFor(null);
      setTrackingCode("");
      // Retry the advance now that the code exists.
      await atelierApi.advance(toAdvance.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ثبت کد رهگیری");
    }
  }

  async function printSelected(format: "png" | "pdf") {
    try {
      await atelierApi.printQueue(Array.from(selected), sheetSize, format);
      setShowQueueModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در چاپ گروهی");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold text-navy">سفارش‌های آتلیه</h1>
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
            disabled={selected.size === 0}
            onClick={() => setShowQueueModal(true)}
            className="btn-primary py-2 text-sm disabled:opacity-40"
          >
            چاپ گروهی صف چاپ ({selected.size})
          </button>
        </div>
      </div>

      {/* Stage filter tabs with counts */}
      <div className="mb-5 flex flex-wrap gap-2">
        <StageTab
          label="همه"
          count={stages.reduce((s, x) => s + x.count, 0)}
          active={activeStage === "all"}
          onClick={() => setActiveStage("all")}
        />
        {stages.map((s) => (
          <StageTab
            key={s.key}
            label={s.label}
            count={s.count}
            active={activeStage === s.key}
            onClick={() => setActiveStage(s.key)}
          />
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
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
              <th className="p-3">کد رهگیری</th>
              <th className="p-3">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-line/60 hover:bg-purple-tint/40">
                <td className="p-3">
                  <input
                    type="checkbox"
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
                    {STATUS_LABELS[o.fulfillment_status] || o.fulfillment_status}
                  </span>
                </td>
                <td className="p-3 text-xs text-muted" dir="ltr">
                  {o.tracking_code || "—"}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => advance(o)}
                      disabled={o.fulfillment_status === "delivered"}
                      className="rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white disabled:opacity-30"
                    >
                      پیشبرد وضعیت
                    </button>
                    <button
                      onClick={() =>
                        atelierApi.printSheet(o.id, "pdf", sheetSize).catch((e) =>
                          setError(e.message)
                        )
                      }
                      className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-navy"
                    >
                      شیت چاپ
                    </button>
                    <button
                      onClick={() =>
                        atelierApi
                          .shippingLabel(o.id, "pdf")
                          .catch((e) => setError(e.message))
                      }
                      className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-navy"
                    >
                      برچسب آدرس
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm text-muted">
                  سفارشی در این مرحله وجود ندارد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Group-print modal */}
      {showQueueModal && (
        <Modal onClose={() => setShowQueueModal(false)}>
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
            <button onClick={() => printSelected("pdf")} className="btn-primary flex-1">
              دانلود PDF
            </button>
            <button onClick={() => printSelected("png")} className="btn-outline flex-1">
              دانلود PNG
            </button>
          </div>
        </Modal>
      )}

      {/* Tracking-code modal (blocks shipping until filled) */}
      {trackingFor && (
        <Modal onClose={() => setTrackingFor(null)}>
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
        </Modal>
      )}
    </div>
  );
}

function StageTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-bold transition ${
        active
          ? "bg-purple text-white"
          : "border border-line bg-white text-navy hover:border-purple"
      }`}
    >
      {label}
      <span
        className={`mr-2 rounded-full px-2 py-0.5 text-xs ${
          active ? "bg-white/25" : "bg-purple-tint text-purple-deep"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

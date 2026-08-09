"use client";

import { useEffect, useState } from "react";
import { panelApi } from "@/lib/panelApi";

const STATUS_LABELS: Record<string, string> = {
  created: "ثبت شد", paid: "پرداخت شد", preparing: "در حال آماده‌سازی",
  printed: "چاپ شد", shipped: "ارسال شد", delivered: "تحویل داده شد", cancelled: "لغو شد",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [trackingDraft, setTrackingDraft] = useState("");

  function load() {
    panelApi.listAllOrders().then(setOrders).catch(() => {});
  }
  useEffect(load, []);

  async function expand(orderId: string) {
    if (expanded === orderId) { setExpanded(null); setDetail(null); return; }
    const d = await panelApi.getAdminOrderDetail(orderId);
    setDetail(d);
    setTrackingDraft(d.order?.tracking_code || "");
    setExpanded(orderId);
  }

  async function setStatus(orderId: string, status: string) {
    await panelApi.updateOrderStatus(orderId, { status, tracking_code: trackingDraft || undefined });
    load();
    if (expanded === orderId) expand(orderId);
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-extrabold">همهٔ سفارش‌ها</h2>
        <button onClick={load} className="btn-outline text-xs px-3 py-1.5">به‌روزرسانی</button>
      </div>
      {orders.length === 0 ? (
        <p className="text-muted text-center py-10">هنوز سفارشی ثبت نشده.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((o) => (
            <div key={o.id} className="border border-line rounded-md2 overflow-hidden">
              <button onClick={() => expand(o.id)} className="w-full flex justify-between items-center px-4 py-3 text-[13.5px]">
                <span className="font-mono2">{o.id.slice(0, 8)}</span>
                <span>{o.user_phone}</span>
                <span>{o.quantity} قطعه</span>
                <span className="font-mono2">{o.total_price?.toLocaleString("fa-IR")} ت</span>
                <span className="px-2.5 py-1 rounded-full bg-purple-tint text-xs">{STATUS_LABELS[o.status] || o.status}</span>
              </button>
              {expanded === o.id && detail && (
                <div className="border-t border-line p-4 bg-purple-tint/30 flex flex-col gap-3">
                  {detail.address && (
                    <p className="text-[13px] text-muted">
                      آدرس: {detail.address.province}، {detail.address.city}، {detail.address.full_address} — {detail.address.full_name} ({detail.address.phone_number})
                    </p>
                  )}
                  <div className="flex gap-2 items-end flex-wrap">
                    <div>
                      <label className="field-label">وضعیت</label>
                      <select defaultValue={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className="field-input">
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[160px]">
                      <label className="field-label">کد رهگیری پستی</label>
                      <input value={trackingDraft} onChange={(e) => setTrackingDraft(e.target.value)} className="field-input" />
                    </div>
                    <button onClick={() => setStatus(o.id, o.status)} className="btn-primary text-sm px-4 py-2.5">ذخیره</button>
                  </div>
                  <div className="flex flex-col gap-1">
                    {detail.history?.map((h: any, i: number) => (
                      <p key={i} className="text-xs text-muted">• {STATUS_LABELS[h.status] || h.status} {h.note ? `— ${h.note}` : ""}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

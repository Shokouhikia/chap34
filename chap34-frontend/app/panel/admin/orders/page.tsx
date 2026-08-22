"use client";

import { Fragment, useEffect, useState } from "react";
import { panelApi } from "@/lib/panelApi";
import OrderPhotoThumb from "@/components/OrderPhotoThumb";

// The admin screen edits the CUSTOMER-facing Order.status (not the atelier's
// 11-stage fulfillment_status), so it keeps its own shorter vocabulary.
const STATUS_LABELS: Record<string, string> = {
  created: "ثبت شد",
  paid: "پرداخت شد",
  preparing: "در حال آماده‌سازی",
  printed: "چاپ شد",
  shipped: "ارسال شد",
  delivered: "تحویل داده شد",
  cancelled: "لغو شد",
};

function faDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fa-IR");
  } catch {
    return iso.slice(0, 10);
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [trackingDraft, setTrackingDraft] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  function load() {
    panelApi.listAllOrders().then(setOrders).catch(() => {});
  }
  useEffect(load, []);

  async function expand(orderId: string) {
    if (expanded === orderId) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    const d = await panelApi.getAdminOrderDetail(orderId);
    setDetail(d);
    setTrackingDraft(d.order?.tracking_code || "");
    setExpanded(orderId);
  }

  async function setStatus(orderId: string, status: string) {
    await panelApi.updateOrderStatus(orderId, {
      status,
      tracking_code: trackingDraft || undefined,
    });
    load();
    if (expanded === orderId) expand(orderId);
  }

  // Filtering is client-side because listAllOrders() returns every order in
  // one call; there's no paginated admin endpoint to page through.
  const visible = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (search) {
      const needle = search.trim().toLowerCase();
      const hay = `${o.id} ${o.user_phone || ""}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-extrabold text-navy">همهٔ سفارش‌ها</h1>
          <p className="mt-0.5 text-xs text-muted">
            {visible.length.toLocaleString("fa-IR")} از{" "}
            {orders.length.toLocaleString("fa-IR")} سفارش
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی شناسه یا تلفن"
            className="field-input w-auto py-1.5 text-[13px]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="field-input w-auto py-1.5 text-[13px]"
          >
            <option value="all">همه وضعیت‌ها</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button
            onClick={load}
            className="rounded-lg border border-line px-3.5 py-2 text-[13px] font-bold text-navy"
          >
            به‌روزرسانی
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table-panel min-w-[820px]">
          <thead>
            <tr>
              <th>عکس</th>
              <th>شناسه</th>
              <th>تاریخ</th>
              <th>تلفن</th>
              <th>تعداد</th>
              <th>مبلغ</th>
              <th>وضعیت</th>
              <th>کد رهگیری</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((o) => (
              <Fragment key={o.id}>
                <tr>
                  <td>
                    <div className="flex flex-col items-center gap-1">
                      <OrderPhotoThumb photoUrl={o.photo_url} alt={o.user_phone} />
                      {o.photo_url && (
                        <a
                          href={panelApi.fileUrl(o.photo_url)}
                          download
                          className="text-[10px] font-bold text-purple-deep hover:underline"
                        >
                          دانلود
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="font-mono2 font-bold text-navy" dir="ltr">
                    {o.id.slice(0, 8)}
                  </td>
                  <td className="whitespace-nowrap text-xs text-muted">
                    {faDate(o.created_at)}
                  </td>
                  <td className="font-mono2 text-xs" dir="ltr">
                    {o.user_phone}
                  </td>
                  <td className="font-mono2">{o.quantity}</td>
                  <td className="whitespace-nowrap font-mono2 text-xs">
                    {o.total_price?.toLocaleString("fa-IR")} ت
                  </td>
                  <td>
                    <span className="pill-status">
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </td>
                  <td className="font-mono2 text-xs text-muted" dir="ltr">
                    {o.tracking_code || "—"}
                  </td>
                  <td>
                    <button
                      onClick={() => expand(o.id)}
                      className="rounded-lg border border-line px-2.5 py-1 text-xs font-bold text-navy"
                    >
                      {expanded === o.id ? "بستن" : "جزئیات"}
                    </button>
                  </td>
                </tr>
                {expanded === o.id && detail && (
                  <tr>
                    <td colSpan={9} className="bg-purple-tint/30 !p-4">
                      {detail.address && (
                        <p className="mb-3 text-[13px] text-muted">
                          آدرس: {detail.address.province}، {detail.address.city}،{" "}
                          {detail.address.full_address} — {detail.address.full_name} (
                          {detail.address.phone_number})
                        </p>
                      )}
                      <div className="flex flex-wrap items-end gap-2">
                        <div>
                          <label className="field-label">وضعیت</label>
                          <select
                            defaultValue={o.status}
                            onChange={(e) => setStatus(o.id, e.target.value)}
                            className="field-input w-auto py-1.5 text-[13px]"
                          >
                            {Object.entries(STATUS_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="min-w-[160px] flex-1">
                          <label className="field-label">کد رهگیری پستی</label>
                          <input
                            value={trackingDraft}
                            onChange={(e) => setTrackingDraft(e.target.value)}
                            className="field-input py-1.5 text-[13px]"
                            dir="ltr"
                          />
                        </div>
                        <button
                          onClick={() => setStatus(o.id, o.status)}
                          className="rounded-lg bg-navy px-4 py-2 text-[13px] font-bold text-white"
                        >
                          ذخیره
                        </button>
                      </div>
                      {detail.history?.length > 0 && (
                        <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
                          {detail.history.map((h: any, i: number) => (
                            <p key={i} className="text-xs text-muted">
                              • {STATUS_LABELS[h.status] || h.status}
                              {h.note ? ` — ${h.note}` : ""}
                            </p>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-sm text-muted">
                  سفارشی با این فیلترها پیدا نشد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

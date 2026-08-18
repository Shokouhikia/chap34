"use client";

import { useEffect, useState } from "react";
import { panelApi, OrderSummary } from "@/lib/panelApi";
import OrderPhotoThumb from "@/components/OrderPhotoThumb";

type Shipment = {
  id: string;
  code: string;
  order_count: number;
  handed_to_post_at: string | null;
  created_at: string;
};

export default function AtelierShipmentsPage() {
  const [packable, setPackable] = useState<OrderSummary[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detailOrders, setDetailOrders] = useState<OrderSummary[]>([]);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [pk, sh] = await Promise.all([
        panelApi.shipmentsPackable(),
        panelApi.listShipments(),
      ]);
      setPackable(pk.orders);
      setShipments(sh);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggle(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function createShipment() {
    setError(null);
    try {
      const res = await panelApi.createShipment(Array.from(selected));
      setNotice(`محموله ${res.code} با ${res.order_count} سفارش ساخته شد`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    }
  }

  async function openShipment(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    try {
      const data = await panelApi.getShipment(id);
      setDetailOrders(data.orders);
      setExpanded(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    }
  }

  async function act(fn: () => Promise<unknown>, thenReopen?: string) {
    setError(null);
    try {
      await fn();
      await load();
      if (thenReopen) {
        const data = await panelApi.getShipment(thenReopen);
        setDetailOrders(data.orders);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-extrabold text-navy">ارسال و محموله‌ها</h1>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-bold text-green-600">
          {notice}
        </div>
      )}

      <div className="card mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-extrabold text-navy">
            سفارش‌های بسته‌بندی‌شده ({packable.length})
          </h2>
          <button
            onClick={createShipment}
            disabled={selected.size === 0}
            className="btn-primary py-2 text-sm disabled:opacity-40"
          >
            ایجاد محموله ({selected.size})
          </button>
        </div>
        <div className="space-y-2">
          {packable.map((o) => (
            <label
              key={o.id}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.has(o.id)}
                onChange={() => toggle(o.id)}
              />
              <OrderPhotoThumb photoUrl={o.photo_url} alt={o.customer_name} />
              <span className="font-bold text-navy" dir="ltr">
                {o.order_code}
              </span>
              <span className="text-muted">{o.customer_name}</span>
            </label>
          ))}
          {packable.length === 0 && (
            <p className="text-sm text-muted">سفارش بسته‌بندی‌شده‌ای آماده ارسال نیست.</p>
          )}
        </div>
      </div>

      <h2 className="mb-3 font-extrabold text-navy">محموله‌ها</h2>
      <div className="space-y-4">
        {shipments.map((s) => (
          <div key={s.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <span className="text-lg font-extrabold text-navy" dir="ltr">
                  {s.code}
                </span>
                <span className="text-sm text-muted">{s.order_count} سفارش</span>
                {s.handed_to_post_at && (
                  <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-600">
                    تحویل پست شده
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    panelApi.postDeliveryList(s.id).catch((e) => setError(e.message))
                  }
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-navy"
                >
                  لیست تحویل پست
                </button>
                <button
                  onClick={() =>
                    panelApi.shipmentLabels(s.id).catch((e) => setError(e.message))
                  }
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-navy"
                >
                  برچسب‌های پستی
                </button>
                {!s.handed_to_post_at && (
                  <button
                    onClick={() => act(() => panelApi.handToPost(s.id), s.id)}
                    className="rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white"
                  >
                    تحویل به پست
                  </button>
                )}
                <button
                  onClick={() => openShipment(s.id)}
                  className="rounded-lg bg-purple px-3 py-1.5 text-xs font-bold text-white"
                >
                  {expanded === s.id ? "بستن" : "مدیریت سفارش‌ها"}
                </button>
              </div>
            </div>

            {expanded === s.id && (
              <div className="mt-4 space-y-2 border-t border-line pt-4">
                {detailOrders.map((o) => (
                  <div
                    key={o.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-navy" dir="ltr">
                        {o.order_code}
                      </span>
                      <span className="text-muted">{o.customer_name}</span>
                      <span className="rounded-full bg-purple-tint px-2 py-0.5 text-xs font-bold text-purple-deep">
                        {o.fulfillment_status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        value={trackingInputs[o.id] ?? o.tracking_code ?? ""}
                        onChange={(e) =>
                          setTrackingInputs((t) => ({ ...t, [o.id]: e.target.value }))
                        }
                        placeholder="کد رهگیری"
                        className="field-input w-36 py-1.5 text-xs"
                        dir="ltr"
                      />
                      <button
                        onClick={() =>
                          act(
                            () =>
                              panelApi.setTracking(
                                o.id,
                                trackingInputs[o.id] ?? o.tracking_code ?? ""
                              ),
                            s.id
                          )
                        }
                        className="rounded-lg bg-navy px-2.5 py-1.5 text-xs font-bold text-white"
                      >
                        ثبت و ارسال
                      </button>
                      <button
                        onClick={() => act(() => panelApi.markDelivered(o.id), s.id)}
                        className="rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-bold text-white"
                      >
                        تحویل مشتری
                      </button>
                      <button
                        onClick={() =>
                          panelApi.orderLabel(o.id).catch((e) => setError(e.message))
                        }
                        className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold text-navy"
                      >
                        برچسب
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {shipments.length === 0 && !loading && (
          <p className="text-sm text-muted">هنوز محموله‌ای ساخته نشده است.</p>
        )}
      </div>
    </div>
  );
}

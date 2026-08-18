"use client";

import { useEffect, useState } from "react";
import { panelApi, OrderSummary } from "@/lib/panelApi";
import OrderPhotoThumb from "@/components/OrderPhotoThumb";

type Item = { key: string; label: string };
type PackOrder = OrderSummary & { packing_checklist: Record<string, boolean> };

export default function AtelierPackingPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [orders, setOrders] = useState<PackOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [tpl, pending] = await Promise.all([
        panelApi.packingTemplate(),
        panelApi.packingPending(),
      ]);
      setItems(tpl.items);
      setOrders(pending.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleItem(o: PackOrder, key: string, value: boolean) {
    setOrders((prev) =>
      prev.map((x) =>
        x.id === o.id
          ? { ...x, packing_checklist: { ...x.packing_checklist, [key]: value } }
          : x
      )
    );
    try {
      if (o.fulfillment_status === "ready_to_pack") {
        await panelApi.packingStart(o.id);
      }
      await panelApi.packingChecklist(o.id, { [key]: value });
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    }
  }

  async function confirm(o: PackOrder) {
    setError(null);
    try {
      await panelApi.packingConfirm(o.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-extrabold text-navy">بسته‌بندی</h1>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {orders.map((o) => {
          const allChecked = items.every((i) => o.packing_checklist?.[i.key]);
          return (
            <div key={o.id} className="card">
              <div className="mb-3 flex items-center gap-3">
                <OrderPhotoThumb photoUrl={o.photo_url} size="md" alt={o.customer_name} />
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="font-bold text-navy" dir="ltr">
                    {o.order_code}
                  </span>
                  <span className="truncate text-sm text-muted">{o.customer_name}</span>
                </div>
              </div>
              <div className="mb-4 space-y-2">
                {items.map((i) => (
                  <label
                    key={i.key}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={!!o.packing_checklist?.[i.key]}
                      onChange={(e) => toggleItem(o, i.key, e.target.checked)}
                    />
                    <span className={o.packing_checklist?.[i.key] ? "text-navy" : "text-muted"}>
                      {i.label}
                    </span>
                  </label>
                ))}
              </div>
              <button
                onClick={() => confirm(o)}
                disabled={!allChecked}
                className="btn-primary w-full py-2 text-sm disabled:opacity-40"
              >
                تأیید بسته‌بندی
              </button>
            </div>
          );
        })}
        {orders.length === 0 && !loading && (
          <p className="text-sm text-muted">سفارشی برای بسته‌بندی وجود ندارد.</p>
        )}
      </div>
    </div>
  );
}

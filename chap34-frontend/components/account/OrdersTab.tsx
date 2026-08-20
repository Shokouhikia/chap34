"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ORDER_STATUS_LABELS, userApi, type UserOrder } from "@/lib/userApi";

const SIZE_LABEL: Record<string, string> = { "3x4": "۳×۴", "6x8": "۶×۸" };
const PAPER_LABEL: Record<string, string> = { glossy: "چاپ براق (گلاسه)", matte: "چاپ مات" };
const toman = (n: number) => n.toLocaleString("fa-IR");

function OrderCard({ order }: { order: UserOrder }) {
  const [open, setOpen] = useState(false);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-right"
      >
        <div className="flex items-center gap-3">
          {order.photo_url && (
            <div className="h-11 w-9 shrink-0 overflow-hidden rounded-lg border border-line bg-purple-tint/40">
              <img
                src={api.fileUrl(order.photo_url)}
                alt="عکس سفارش"
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div>
            <span className="block text-sm font-extrabold text-navy" dir="ltr">
              {order.order_code}
            </span>
            <span className="mt-1 block text-xs text-muted">
              {new Date(order.created_at).toLocaleDateString("fa-IR")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              isCancelled
                ? "bg-line text-muted"
                : order.status === "delivered"
                ? "bg-success/10 text-success"
                : "bg-purple-tint text-purple-deep"
            }`}
          >
            {ORDER_STATUS_LABELS[order.status]}
          </span>
          <span className={`inline-block text-muted transition ${open ? "rotate-180" : ""}`}>
            ⌄
          </span>
        </div>
      </button>

      {open && (
        <div className="mt-5 border-t border-line pt-5">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="block text-muted">سایز</span>
              <span className="font-bold text-navy">{SIZE_LABEL[order.size]}</span>
            </div>
            <div>
              <span className="block text-muted">نوع کاغذ</span>
              <span className="font-bold text-navy">{PAPER_LABEL[order.paper_type]}</span>
            </div>
            <div>
              <span className="block text-muted">تعداد</span>
              <span className="font-bold text-navy">{toman(order.quantity)} قطعه</span>
            </div>
            <div>
              <span className="block text-muted">مبلغ</span>
              <span className="font-bold text-navy">{toman(order.total_price)} تومان</span>
            </div>
          </div>

          {order.address && (
            <div className="mt-4 border-t border-dashed border-line pt-4 text-xs">
              <span className="mb-1 block font-bold text-navy">آدرس ارسال</span>
              <p className="text-muted">
                {order.address.province}، {order.address.city}، {order.address.full_address}
              </p>
              <p className="mt-1 text-muted">
                {order.address.full_name} — {order.address.phone}
              </p>
            </div>
          )}

          {order.tracking_code && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-purple-tint px-4 py-3">
              <span className="text-xs font-bold text-navy">کد رهگیری پستی</span>
              <span className="text-xs font-bold text-purple-deep" dir="ltr">
                {order.tracking_code}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrdersTab() {
  const [orders, setOrders] = useState<UserOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    userApi
      .getMyOrders()
      .then(setOrders)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "خطای ناشناخته");
        setOrders([]);
      });
  }, []);

  if (orders === null) {
    return <p className="text-center text-sm text-muted">در حال بارگذاری...</p>;
  }

  if (error) {
    return <p className="text-center text-sm font-bold text-red-500">{error}</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="card text-center">
        <p className="mb-4 text-sm text-muted">هنوز سفارشی ثبت نکرده‌ای.</p>
        <Link href="/capture" className="btn-primary">
          ساخت و سفارش چاپ عکس
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}

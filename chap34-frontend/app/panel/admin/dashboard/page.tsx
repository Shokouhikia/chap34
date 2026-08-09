"use client";

import { useEffect, useState } from "react";
import { panelApi } from "@/lib/panelApi";

const STATUS_LABELS: Record<string, string> = {
  created: "ثبت شد", paid: "پرداخت شد", preparing: "در حال آماده‌سازی",
  printed: "چاپ شد", shipped: "ارسال شد", delivered: "تحویل داده شد", cancelled: "لغو شد",
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    panelApi.getDashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-500">{error}</p>;
  if (!data) return <p className="text-muted">در حال بارگذاری...</p>;

  const cards = [
    { label: "تعداد سفارش‌ها", value: data.total_orders?.toLocaleString("fa-IR") },
    { label: "مشتری‌ها", value: data.total_customers?.toLocaleString("fa-IR") },
    { label: "عکس‌های پردازش‌شده", value: data.total_photos?.toLocaleString("fa-IR") },
    { label: "درآمد کل", value: (data.total_revenue?.toLocaleString("fa-IR") || "0") + " ت" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold text-navy">داشبورد</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="card !p-4 text-center">
            <p className="text-xl font-extrabold">{c.value}</p>
            <p className="text-xs text-muted mt-1">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 className="font-extrabold mb-4">وضعیت سفارش‌ها</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(data.orders_by_status || {}).map(([status, count]: any) => (
            <div key={status} className="flex justify-between border-b border-line pb-2 text-[13.5px]">
              <span>{STATUS_LABELS[status] || status}</span>
              <span className="font-bold">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

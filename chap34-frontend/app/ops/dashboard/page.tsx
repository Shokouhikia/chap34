"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { opsApi } from "@/lib/opsApi";

type Card = { status: string; label: string; count: number };

export default function OpsDashboardPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    opsApi
      .dashboard()
      .then((d) => {
        setCards(d.cards);
        setTotal(d.total);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-navy">داشبورد عملیات</h1>
        <span className="text-sm text-muted">مجموع سفارش‌ها: {total}</span>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <button
            key={c.status}
            onClick={() => router.push(`/ops/orders?status=${c.status}`)}
            className="card text-right transition hover:-translate-y-0.5 hover:border-purple"
          >
            <div className="text-3xl font-extrabold text-purple-deep">{c.count}</div>
            <div className="mt-1 text-sm font-bold text-navy">{c.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

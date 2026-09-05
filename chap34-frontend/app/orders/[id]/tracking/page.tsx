"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ORDER_STATUS_LABELS, ORDER_STATUS_SEQUENCE } from "@/lib/orderStatusLabels";

type HistoryItem = { status: string; created_at: string };
type Order = { id: string; status: string };

export default function TrackingPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  async function load() {
    const data = await api.getTracking(params.id);
    setOrder(data.order);
    setHistory(data.history);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const doneStatuses = new Set(history.map((h) => h.status));

  return (
    <div className="mx-auto max-w-sm">
      <h2 className="mb-1 text-center text-xl font-extrabold text-navy">
        پیگیری سفارش
      </h2>
      <p className="mb-8 text-center text-xs text-muted">
        شماره سفارش: {params.id.slice(0, 8)}
      </p>

      <div className="relative space-y-6 border-r-2 border-line pr-4">
        {ORDER_STATUS_SEQUENCE.map((status) => {
          const done = doneStatuses.has(status);
          const current = order?.status === status;
          return (
            <div key={status} className="relative">
              <span
                className={`absolute -right-[22px] top-0.5 h-4 w-4 rounded-full ring-4 ring-[#faf9fc] ${
                  current
                    ? "bg-purple"
                    : done
                    ? "bg-success"
                    : "bg-line"
                }`}
              />
              <b
                className={`block text-sm ${
                  done || current ? "text-navy" : "text-muted"
                }`}
              >
                {ORDER_STATUS_LABELS[status]}
              </b>
            </div>
          );
        })}
      </div>
    </div>
  );
}

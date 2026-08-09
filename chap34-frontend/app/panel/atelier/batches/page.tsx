"use client";

import { useEffect, useState } from "react";
import { panelApi } from "@/lib/panelApi";

type Batch = {
  id: string;
  code: string;
  sheet_size: string;
  status: string;
  order_count: number;
  piece_count: number;
  sheet_count: number | null;
  created_at: string;
};

const BATCH_STATUS: Record<string, string> = {
  queued: "در صف",
  printing: "در حال چاپ",
  printed: "چاپ‌شده",
};

export default function AtelierBatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setBatches(await panelApi.listBatches());
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-extrabold text-navy">بچ‌های چاپ</h1>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {batches.map((b) => (
          <div key={b.id} className="card">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-lg font-extrabold text-navy" dir="ltr">
                {b.code}
              </span>
              <span className="rounded-full bg-purple-tint px-3 py-1 text-xs font-bold text-purple-deep">
                {BATCH_STATUS[b.status] || b.status}
              </span>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-2 text-center text-sm">
              <Stat label="سفارش" value={b.order_count} />
              <Stat label="قطعه" value={b.piece_count} />
              <Stat label="شیت" value={b.sheet_count ?? "—"} />
            </div>
            <div className="mb-3 text-xs text-muted">
              سایز شیت: {b.sheet_size === "a4" ? "A4" : "۱۰×۱۵"}
            </div>
            <div className="flex flex-wrap gap-2">
              {b.status === "queued" && (
                <button
                  onClick={() => act(() => panelApi.startPrinting(b.id))}
                  className="rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white"
                >
                  شروع چاپ
                </button>
              )}
              {b.status === "printing" && (
                <button
                  onClick={() => act(() => panelApi.markPrinted(b.id))}
                  className="rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white"
                >
                  اتمام چاپ
                </button>
              )}
              <button
                onClick={() =>
                  panelApi.batchSheets(b.id, "pdf").catch((e) => setError(e.message))
                }
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-navy"
              >
                دانلود شیت‌ها (PDF)
              </button>
            </div>
          </div>
        ))}
        {batches.length === 0 && !loading && (
          <p className="text-sm text-muted">هنوز بچی ساخته نشده است.</p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-purple-tint/60 py-2">
      <div className="text-lg font-extrabold text-purple-deep">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

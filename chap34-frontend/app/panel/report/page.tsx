"use client";

import { useCallback, useEffect, useState } from "react";
import { panelApi, ReportFilters, ReportRow } from "@/lib/panelApi";
import { statusLabel } from "@/lib/statusLabels";

// Only the statuses the backend's FulfillmentStatus enum actually has -
// lib/statusLabels.ts still carries a few retired ones (qc_*, sorting) that
// would make the API reject the filter with a 400.
const FILTER_STATUSES = [
  "registered",
  "queued",
  "printing",
  "printed",
  "ready_to_pack",
  "packing",
  "packed",
  "ready_to_ship",
  "handed_to_post",
  "shipped",
  "delivered",
];

const PRINT_SIZE_LABEL: Record<string, string> = {
  "3x4": "۳×۴",
  "6x8": "۶×۸",
};

const PAPER_LABEL: Record<string, string> = {
  glossy: "گلاسه",
  matte: "مات",
};

const PAGE_SIZE = 50;

const EMPTY: ReportFilters = {
  phone: "",
  name: "",
  status: "all",
  date_from: "",
  date_to: "",
};

function faDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fa-IR");
  } catch {
    return iso.slice(0, 10);
  }
}

export default function AtelierReportPage() {
  // `draft` is what's in the inputs; `applied` is what the last search used.
  // Keeping them separate means typing doesn't refetch on every keystroke and
  // the CSV export always matches the table on screen.
  const [draft, setDraft] = useState<ReportFilters>(EMPTY);
  const [applied, setApplied] = useState<ReportFilters>(EMPTY);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await panelApi.orderReport(applied, page, PAGE_SIZE);
      setRows(data.orders);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت گزارش");
    } finally {
      setLoading(false);
    }
  }, [applied, page]);

  useEffect(() => {
    load();
  }, [load]);

  function search() {
    setPage(1);
    setApplied(draft);
  }

  function reset() {
    setDraft(EMPTY);
    setApplied(EMPTY);
    setPage(1);
  }

  async function exportCsv() {
    setExporting(true);
    setError(null);
    try {
      await panelApi.orderReportCsv(applied);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در خروجی اکسل");
    } finally {
      setExporting(false);
    }
  }

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function set<K extends keyof ReportFilters>(key: K, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-extrabold text-navy">گزارش سفارشات</h1>
          <p className="mt-0.5 text-xs text-muted">
            {loading ? "در حال بارگذاری..." : `${total.toLocaleString("fa-IR")} سفارش`}
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={exporting || total === 0}
          className="rounded-lg bg-purple px-3.5 py-2 text-[13px] font-bold text-white transition hover:bg-purple-deep disabled:opacity-40"
        >
          {exporting ? "در حال آماده‌سازی..." : "خروجی اکسل"}
        </button>
      </div>

      <div className="card mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="field-label">شماره تماس</label>
            <input
              value={draft.phone}
              onChange={(e) => set("phone", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              className="field-input py-1.5 text-[13px]"
              placeholder="۰۹۱۲..."
              dir="ltr"
            />
          </div>
          <div>
            <label className="field-label">نام و نام خانوادگی</label>
            <input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              className="field-input py-1.5 text-[13px]"
              placeholder="نام گیرنده"
            />
          </div>
          <div>
            <label className="field-label">وضعیت</label>
            <select
              value={draft.status}
              onChange={(e) => set("status", e.target.value)}
              className="field-input py-1.5 text-[13px]"
            >
              <option value="all">همه</option>
              {FILTER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">از تاریخ</label>
            <input
              type="date"
              value={draft.date_from}
              onChange={(e) => set("date_from", e.target.value)}
              className="field-input py-1.5 text-[13px]"
              dir="ltr"
            />
          </div>
          <div>
            <label className="field-label">تا تاریخ</label>
            <input
              type="date"
              value={draft.date_to}
              onChange={(e) => set("date_to", e.target.value)}
              className="field-input py-1.5 text-[13px]"
              dir="ltr"
            />
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={search}
            className="rounded-lg bg-navy px-4 py-1.5 text-[13px] font-bold text-white"
          >
            جستجو
          </button>
          <button
            onClick={reset}
            className="rounded-lg border border-line px-4 py-1.5 text-[13px] font-bold text-navy"
          >
            پاک کردن
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-bold text-red-600">
          {error}
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="table-panel min-w-[1100px]">
          <thead>
            <tr>
              <th>کد سفارش</th>
              <th>تاریخ</th>
              <th>گیرنده</th>
              <th>تلفن</th>
              <th>سایز</th>
              <th>کاغذ</th>
              <th>تعداد</th>
              <th>مبلغ</th>
              <th>وضعیت</th>
              <th>کد رهگیری</th>
              <th>استان / شهر</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="font-mono2 font-bold text-navy" dir="ltr">
                  {r.order_code}
                </td>
                <td className="whitespace-nowrap text-xs text-muted">
                  {faDate(r.created_at)}
                </td>
                <td className="whitespace-nowrap">{r.customer_name}</td>
                <td className="font-mono2 text-xs" dir="ltr">
                  {r.phone}
                </td>
                <td className="whitespace-nowrap font-bold">
                  {PRINT_SIZE_LABEL[r.size] || r.size}
                </td>
                <td className="whitespace-nowrap text-xs">
                  {PAPER_LABEL[r.paper_type] || r.paper_type || "—"}
                </td>
                <td className="font-mono2">{r.quantity}</td>
                <td className="whitespace-nowrap font-mono2 text-xs">
                  {r.total_price?.toLocaleString("fa-IR")}
                </td>
                <td>
                  <span className="pill-status">{statusLabel(r.fulfillment_status)}</span>
                </td>
                <td className="font-mono2 text-xs text-muted" dir="ltr">
                  {r.tracking_code || "—"}
                </td>
                <td className="whitespace-nowrap text-xs">
                  {r.province} / {r.city}
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={11} className="p-8 text-center text-sm text-muted">
                  سفارشی با این فیلترها پیدا نشد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {lastPage > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-navy disabled:opacity-30"
          >
            قبلی
          </button>
          <span className="text-xs text-muted">
            صفحه {page.toLocaleString("fa-IR")} از {lastPage.toLocaleString("fa-IR")}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page >= lastPage}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-navy disabled:opacity-30"
          >
            بعدی
          </button>
        </div>
      )}
    </div>
  );
}

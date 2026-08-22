"use client";

import { useEffect, useState } from "react";
import { panelApi } from "@/lib/panelApi";

type DiscountCode = {
  id: string;
  code: string;
  percent: number;
  active: boolean;
  usage_count: number;
  max_uses_per_user: number | null;
};

type Usage = { code: string; total_uses: number; by_user: { phone: string; count: number }[] };

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newPercent, setNewPercent] = useState("10");
  const [newMaxUses, setNewMaxUses] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const [limitDrafts, setLimitDrafts] = useState<Record<string, string>>({});
  const [savingLimit, setSavingLimit] = useState<string | null>(null);

  function load() {
    panelApi.listDiscountCodes().then(setDiscounts).catch(() => {});
  }
  useEffect(load, []);

  async function createDiscount() {
    setError(null);
    try {
      const maxUses = newMaxUses.trim() ? Number(newMaxUses) : null;
      await panelApi.createDiscountCode(newCode, Number(newPercent), maxUses);
      setNewCode("");
      setNewPercent("10");
      setNewMaxUses("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ایجاد کد ناموفق بود");
    }
  }

  async function toggleDiscount(id: string) {
    await panelApi.toggleDiscountCode(id);
    load();
  }

  async function toggleUsage(id: string) {
    if (openId === id) {
      setOpenId(null);
      setUsage(null);
      return;
    }
    setOpenId(id);
    setUsage(null);
    setUsageLoading(true);
    try {
      const data = await panelApi.getDiscountCodeUsage(id);
      setUsage(data);
    } finally {
      setUsageLoading(false);
    }
  }

  function limitDraftFor(d: DiscountCode): string {
    return limitDrafts[d.id] ?? (d.max_uses_per_user != null ? String(d.max_uses_per_user) : "");
  }

  async function saveLimit(d: DiscountCode) {
    setError(null);
    setSavingLimit(d.id);
    try {
      const draft = limitDraftFor(d).trim();
      await panelApi.updateDiscountCodeLimit(d.id, draft ? Number(draft) : null);
      setLimitDrafts((s) => {
        const next = { ...s };
        delete next[d.id];
        return next;
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ذخیره محدودیت ناموفق بود");
    } finally {
      setSavingLimit(null);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-extrabold text-navy">کدهای تخفیف</h1>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-bold text-red-600">
          {error}
        </div>
      )}

      <div className="card mb-4 overflow-x-auto p-0">
        <table className="table-panel min-w-[760px]">
          <thead>
            <tr>
              <th>کد</th>
              <th>درصد</th>
              <th>وضعیت</th>
              <th>دفعات استفاده (کل)</th>
              <th>حداکثر دفعات مجاز به ازای هر کاربر</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {discounts.map((d) => (
              <>
                <tr key={d.id}>
                  <td className="font-mono2" dir="ltr">
                    {d.code}
                  </td>
                  <td>{d.percent}٪</td>
                  <td>
                    {d.active ? (
                      <span className="text-green-600">فعال</span>
                    ) : (
                      <span className="text-muted">غیرفعال</span>
                    )}
                  </td>
                  <td className="font-mono2">{d.usage_count.toLocaleString("fa-IR")}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        value={limitDraftFor(d)}
                        onChange={(e) =>
                          setLimitDrafts((s) => ({ ...s, [d.id]: e.target.value }))
                        }
                        placeholder="نامحدود"
                        className="field-input w-20 py-1 text-[13px]"
                        dir="ltr"
                      />
                      <button
                        onClick={() => saveLimit(d)}
                        disabled={savingLimit === d.id}
                        className="rounded-lg border border-line px-2 py-1 text-xs font-bold text-navy disabled:opacity-40"
                      >
                        ذخیره
                      </button>
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    <button
                      onClick={() => toggleUsage(d.id)}
                      className="ml-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-bold text-navy"
                    >
                      {openId === d.id ? "بستن" : "جزئیات"}
                    </button>
                    <button
                      onClick={() => toggleDiscount(d.id)}
                      className="btn-outline px-3 py-1 text-xs"
                    >
                      {d.active ? "غیرفعال کن" : "فعال کن"}
                    </button>
                  </td>
                </tr>
                {openId === d.id && (
                  <tr key={`${d.id}-usage`}>
                    <td colSpan={6} className="bg-purple-tint/30 p-4">
                      {usageLoading ? (
                        <p className="text-xs text-muted">در حال بارگذاری...</p>
                      ) : usage && usage.by_user.length > 0 ? (
                        <div>
                          <p className="mb-2 text-xs font-bold text-navy">
                            دفعات تکرار استفاده به ازای هر کاربر:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {usage.by_user.map((u) => (
                              <span
                                key={u.phone}
                                className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-navy"
                              >
                                <span dir="ltr">{u.phone}</span>
                                <span className="text-muted">—</span>
                                <span className="text-purple-deep">
                                  {u.count.toLocaleString("fa-IR")} بار
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted">هنوز هیچ کاربری این کد را استفاده نکرده</p>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {discounts.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm text-muted">
                  هنوز کد تخفیفی ساخته نشده
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card p-4">
        <p className="mb-3 text-xs text-muted">
          درصدی که وارد می‌کنید فقط از هزینهٔ چاپ کم می‌شه، نه هزینهٔ ارسال.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="field-label">کد تخفیف</label>
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="مثلاً WELCOME10"
              className="field-input w-auto"
              dir="ltr"
            />
          </div>
          <div>
            <label className="field-label">درصد تخفیف</label>
            <input
              value={newPercent}
              onChange={(e) => setNewPercent(e.target.value)}
              placeholder="٪"
              type="number"
              min={1}
              max={100}
              className="field-input w-24"
            />
          </div>
          <div>
            <label className="field-label">حداکثر دفعات مجاز استفاده به ازای هر کاربر</label>
            <input
              value={newMaxUses}
              onChange={(e) => setNewMaxUses(e.target.value)}
              placeholder="نامحدود"
              type="number"
              min={1}
              className="field-input w-28"
              dir="ltr"
            />
          </div>
          <button onClick={createDiscount} className="btn-primary whitespace-nowrap">
            ایجاد کد
          </button>
        </div>
      </div>
    </div>
  );
}

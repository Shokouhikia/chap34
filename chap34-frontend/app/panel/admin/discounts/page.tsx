"use client";

import { useEffect, useState } from "react";
import { panelApi } from "@/lib/panelApi";

type DiscountCode = {
  id: string;
  code: string;
  percent: number;
  active: boolean;
  usage_count: number;
};

type Usage = { code: string; total_uses: number; by_user: { phone: string; count: number }[] };

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newPercent, setNewPercent] = useState("10");
  const [error, setError] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  function load() {
    panelApi.listDiscountCodes().then(setDiscounts).catch(() => {});
  }
  useEffect(load, []);

  async function createDiscount() {
    setError(null);
    try {
      await panelApi.createDiscountCode(newCode, Number(newPercent));
      setNewCode("");
      setNewPercent("10");
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

  return (
    <div>
      <h1 className="mb-4 text-lg font-extrabold text-navy">کدهای تخفیف</h1>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-bold text-red-600">
          {error}
        </div>
      )}

      <div className="card mb-4 overflow-x-auto p-0">
        <table className="table-panel min-w-[600px]">
          <thead>
            <tr>
              <th>کد</th>
              <th>درصد</th>
              <th>وضعیت</th>
              <th>دفعات استفاده</th>
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
                    <td colSpan={5} className="bg-purple-tint/30 p-4">
                      {usageLoading ? (
                        <p className="text-xs text-muted">در حال بارگذاری...</p>
                      ) : usage && usage.by_user.length > 0 ? (
                        <div>
                          <p className="mb-2 text-xs font-bold text-navy">
                            استفاده به تفکیک کاربر:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {usage.by_user.map((u) => (
                              <span
                                key={u.phone}
                                className="rounded-full bg-white px-3 py-1 text-xs font-bold text-navy"
                                dir="ltr"
                              >
                                {u.phone} × {u.count.toLocaleString("fa-IR")}
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
                <td colSpan={5} className="p-8 text-center text-sm text-muted">
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
        <div className="flex flex-wrap gap-2">
          <input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="کد (مثلاً WELCOME10)"
            className="field-input w-auto"
            dir="ltr"
          />
          <input
            value={newPercent}
            onChange={(e) => setNewPercent(e.target.value)}
            placeholder="٪"
            type="number"
            min={1}
            max={100}
            className="field-input w-24"
          />
          <button onClick={createDiscount} className="btn-primary whitespace-nowrap">
            ایجاد کد
          </button>
        </div>
      </div>
    </div>
  );
}

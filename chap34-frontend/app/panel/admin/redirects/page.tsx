"use client";

import { useEffect, useState } from "react";
import { panelApi, RedirectRow } from "@/lib/panelApi";

const EMPTY_FORM = { source_path: "", destination_path: "", status_code: 301, is_active: true };

export default function AdminRedirectsPage() {
  const [rows, setRows] = useState<RedirectRow[] | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    panelApi
      .listRedirects()
      .then((d) => setRows(d.redirects))
      .catch(() => setRows([]));
  }
  useEffect(load, []);

  function startEdit(row: RedirectRow) {
    setEditingId(row.id);
    setForm({
      source_path: row.source_path,
      destination_path: row.destination_path,
      status_code: row.status_code,
      is_active: row.is_active,
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function submit() {
    setError(null);
    if (!form.source_path.trim() || !form.destination_path.trim()) {
      setError("مبدأ و مقصد الزامی هستند");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await panelApi.updateRedirect(editingId, form);
      } else {
        await panelApi.createRedirect(form);
      }
      cancelEdit();
      load();
    } catch (e: any) {
      setError(e.message || "خطا در ذخیره‌سازی");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("این ریدایرکت حذف شود؟")) return;
    await panelApi.deleteRedirect(id);
    load();
  }

  if (!rows) return <p className="text-muted">در حال بارگذاری...</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="card">
        <h2 className="text-lg font-extrabold mb-1">🔀 مدیریت ریدایرکت‌ها</h2>
        <p className="text-xs text-muted mb-4">
          برای جلوگیری از خطای ۴۰۴ بعد از تغییر آدرس یک صفحه، مسیر قدیمی را به مسیر جدید ریدایرکت کنید.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="field-label">مسیر مبدأ (قدیمی)</label>
            <input
              value={form.source_path}
              onChange={(e) => setForm((f) => ({ ...f, source_path: e.target.value }))}
              className="field-input"
              placeholder="/old-page"
              dir="ltr"
            />
          </div>
          <div>
            <label className="field-label">مسیر مقصد (جدید)</label>
            <input
              value={form.destination_path}
              onChange={(e) => setForm((f) => ({ ...f, destination_path: e.target.value }))}
              className="field-input"
              placeholder="/new-page"
              dir="ltr"
            />
          </div>
          <div>
            <label className="field-label">کد وضعیت</label>
            <select
              value={form.status_code}
              onChange={(e) => setForm((f) => ({ ...f, status_code: Number(e.target.value) }))}
              className="field-input"
            >
              <option value={301}>301 (دائمی)</option>
              <option value={302}>302 (موقت)</option>
              <option value={307}>307 (موقت، حفظ متد)</option>
              <option value={308}>308 (دائمی، حفظ متد)</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-[13px] font-bold">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              فعال
            </label>
          </div>
        </div>

        {error && <p className="text-red-600 text-xs font-bold mt-2">{error}</p>}

        <div className="flex gap-2 mt-3">
          <button onClick={submit} disabled={saving} className="btn-primary">
            {editingId ? "ذخیرهٔ تغییرات" : "افزودن ریدایرکت"}
          </button>
          {editingId && (
            <button onClick={cancelEdit} className="btn-outline">
              انصراف
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="text-lg font-extrabold mb-3">لیست ریدایرکت‌ها</h2>
        {rows.length === 0 ? (
          <p className="text-muted text-sm">هنوز ریدایرکتی ثبت نشده است.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-right text-muted border-b border-line">
                <th className="py-2 px-2">مبدأ</th>
                <th className="py-2 px-2">مقصد</th>
                <th className="py-2 px-2">کد</th>
                <th className="py-2 px-2">وضعیت</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="py-2 px-2 font-mono" dir="ltr">
                    {r.source_path}
                  </td>
                  <td className="py-2 px-2 font-mono" dir="ltr">
                    {r.destination_path}
                  </td>
                  <td className="py-2 px-2">{r.status_code}</td>
                  <td className="py-2 px-2">{r.is_active ? "فعال" : "غیرفعال"}</td>
                  <td className="py-2 px-2 flex gap-2">
                    <button onClick={() => startEdit(r)} className="text-purple-deep font-bold">
                      ویرایش
                    </button>
                    <button onClick={() => remove(r.id)} className="text-red-500 font-bold">
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

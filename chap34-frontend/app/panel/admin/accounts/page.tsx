"use client";

import { useEffect, useState } from "react";
import { panelApi } from "@/lib/panelApi";
import { IRAN_PROVINCES } from "@/lib/iranProvinces";

type Account = {
  id: string;
  username: string;
  name: string;
  is_active: boolean;
  provinces: string[];
};

function provinceSummary(provinces: string[]): string {
  if (!provinces.length) return "بدون محدودیت (همه استان‌ها)";
  if (provinces.length <= 2) return provinces.join("، ");
  return `${provinces.length.toLocaleString("fa-IR")} استان`;
}

function ProvincePicker({
  selected,
  onToggle,
  onClear,
}: {
  selected: Set<string>;
  onToggle: (province: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-purple-tint/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold text-navy">
          استان‌های قابل‌مشاهده (خالی = بدون محدودیت، همه استان‌ها)
        </p>
        <button
          onClick={onClear}
          className="text-xs font-bold text-purple-deep hover:underline"
        >
          پاک‌کردن انتخاب‌ها
        </button>
      </div>
      <div className="grid max-h-48 grid-cols-2 gap-x-3 gap-y-1 overflow-y-auto sm:grid-cols-3">
        {IRAN_PROVINCES.map((p) => (
          <label key={p} className="flex cursor-pointer items-center gap-1.5 text-[12.5px]">
            <input type="checkbox" checked={selected.has(p)} onChange={() => onToggle(p)} />
            <span>{p}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newName, setNewName] = useState("");
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newProvinces, setNewProvinces] = useState<Set<string>>(new Set());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUser, setEditUser] = useState("");
  const [editPass, setEditPass] = useState("");
  const [editProvinces, setEditProvinces] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  function load() {
    panelApi.listAtelierAccounts().then(setAccounts).catch(() => {});
  }
  useEffect(load, []);

  async function create() {
    setError(null);
    try {
      await panelApi.createAtelierAccount(newName, newUser, newPass, Array.from(newProvinces));
      setNewName("");
      setNewUser("");
      setNewPass("");
      setNewProvinces(new Set());
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ایجاد حساب ناموفق بود");
    }
  }

  async function deactivate(id: string) {
    await panelApi.deactivateAtelierAccount(id);
    load();
  }

  function startEdit(a: Account) {
    setEditingId(a.id);
    setEditName(a.name);
    setEditUser(a.username);
    setEditPass("");
    setEditProvinces(new Set(a.provinces));
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditPass("");
  }

  async function saveEdit(id: string) {
    setError(null);
    try {
      await panelApi.updateAtelierAccount(id, {
        name: editName,
        username: editUser,
        password: editPass || undefined,
        provinces: Array.from(editProvinces),
      });
      setEditingId(null);
      setEditPass("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ویرایش حساب ناموفق بود");
    }
  }

  function toggleIn(set: Set<string>, value: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    setter(next);
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-extrabold text-navy">حساب‌های آتلیه</h1>
      <p className="mb-4 text-xs text-muted">
        هر حساب فقط سفارش‌های استان‌هایی که براش انتخاب می‌کنی رو توی صف/گزارش می‌بینه.
        بدون انتخاب استان یعنی بدون محدودیت.
      </p>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-bold text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 mb-4">
        {accounts.map((a) =>
          editingId === a.id ? (
            <div key={a.id} className="card">
              <div className="mb-3 grid gap-2 sm:grid-cols-3">
                <div>
                  <label className="field-label">نام اتلیه</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="field-input py-1.5 text-[13px]"
                  />
                </div>
                <div>
                  <label className="field-label">نام کاربری</label>
                  <input
                    value={editUser}
                    onChange={(e) => setEditUser(e.target.value)}
                    className="field-input py-1.5 text-[13px]"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="field-label">رمز عبور جدید</label>
                  <input
                    value={editPass}
                    onChange={(e) => setEditPass(e.target.value)}
                    placeholder="بدون تغییر"
                    className="field-input py-1.5 text-[13px]"
                    dir="ltr"
                  />
                </div>
              </div>
              <ProvincePicker
                selected={editProvinces}
                onToggle={(p) => toggleIn(editProvinces, p, setEditProvinces)}
                onClear={() => setEditProvinces(new Set())}
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => saveEdit(a.id)}
                  className="rounded-lg bg-purple px-3 py-1.5 text-xs font-bold text-white"
                >
                  ذخیره
                </button>
                <button
                  onClick={cancelEdit}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-navy"
                >
                  لغو
                </button>
              </div>
            </div>
          ) : (
            <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-navy">{a.name}</span>
                  <span className="font-mono2 text-xs text-muted" dir="ltr">
                    {a.username}
                  </span>
                  {a.is_active ? (
                    <span className="text-xs font-bold text-green-600">فعال</span>
                  ) : (
                    <span className="text-xs text-muted">غیرفعال</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted">
                  دسترسی: <span className="font-bold text-purple-deep">{provinceSummary(a.provinces)}</span>
                </p>
              </div>
              <div className="whitespace-nowrap">
                <button
                  onClick={() => startEdit(a)}
                  className="ml-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-bold text-navy"
                >
                  ویرایش
                </button>
                {a.is_active && (
                  <button
                    onClick={() => deactivate(a.id)}
                    className="rounded-lg border border-line px-2.5 py-1 text-xs font-bold text-navy"
                  >
                    غیرفعال کن
                  </button>
                )}
              </div>
            </div>
          )
        )}
        {accounts.length === 0 && (
          <div className="card p-8 text-center text-sm text-muted">هنوز حسابی ساخته نشده</div>
        )}
      </div>

      <div className="card p-4">
        <p className="mb-3 text-sm font-extrabold text-navy">ایجاد حساب جدید</p>
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <div>
            <label className="field-label">نام اتلیه</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="field-input py-1.5 text-[13px]"
            />
          </div>
          <div>
            <label className="field-label">نام کاربری</label>
            <input
              value={newUser}
              onChange={(e) => setNewUser(e.target.value)}
              className="field-input py-1.5 text-[13px]"
              dir="ltr"
            />
          </div>
          <div>
            <label className="field-label">رمز عبور</label>
            <input
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="field-input py-1.5 text-[13px]"
              dir="ltr"
            />
          </div>
        </div>
        <ProvincePicker
          selected={newProvinces}
          onToggle={(p) => toggleIn(newProvinces, p, setNewProvinces)}
          onClear={() => setNewProvinces(new Set())}
        />
        <button
          onClick={create}
          className="mt-3 whitespace-nowrap rounded-lg bg-navy px-4 py-2 text-[13px] font-bold text-white"
        >
          ایجاد
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { panelApi } from "@/lib/panelApi";

type Account = {
  id: string;
  username: string;
  name: string;
  is_active: boolean;
};

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newName, setNewName] = useState("");
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUser, setEditUser] = useState("");
  const [editPass, setEditPass] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    panelApi.listAtelierAccounts().then(setAccounts).catch(() => {});
  }
  useEffect(load, []);

  async function create() {
    setError(null);
    try {
      await panelApi.createAtelierAccount(newName, newUser, newPass);
      setNewName("");
      setNewUser("");
      setNewPass("");
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
      });
      setEditingId(null);
      setEditPass("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ویرایش حساب ناموفق بود");
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-extrabold text-navy">حساب‌های آتلیه</h1>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-bold text-red-600">
          {error}
        </div>
      )}

      <div className="card mb-4 overflow-x-auto p-0">
        <table className="table-panel min-w-[640px]">
          <thead>
            <tr>
              <th>نام اتلیه</th>
              <th>نام کاربری</th>
              <th>رمز عبور جدید</th>
              <th>وضعیت</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) =>
              editingId === a.id ? (
                <tr key={a.id}>
                  <td>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="field-input w-auto py-1.5 text-[13px]"
                    />
                  </td>
                  <td>
                    <input
                      value={editUser}
                      onChange={(e) => setEditUser(e.target.value)}
                      className="field-input w-auto py-1.5 text-[13px]"
                      dir="ltr"
                    />
                  </td>
                  <td>
                    <input
                      value={editPass}
                      onChange={(e) => setEditPass(e.target.value)}
                      placeholder="بدون تغییر"
                      className="field-input w-auto py-1.5 text-[13px]"
                      dir="ltr"
                    />
                  </td>
                  <td>
                    {a.is_active ? (
                      <span className="text-xs font-bold text-green-600">فعال</span>
                    ) : (
                      <span className="text-xs text-muted">غیرفعال</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    <button
                      onClick={() => saveEdit(a.id)}
                      className="ml-1.5 rounded-lg bg-purple px-2.5 py-1 text-xs font-bold text-white"
                    >
                      ذخیره
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="rounded-lg border border-line px-2.5 py-1 text-xs font-bold text-navy"
                    >
                      لغو
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td className="font-mono2" dir="ltr">
                    {a.username}
                  </td>
                  <td className="text-muted">—</td>
                  <td>
                    {a.is_active ? (
                      <span className="text-xs font-bold text-green-600">فعال</span>
                    ) : (
                      <span className="text-xs text-muted">غیرفعال</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
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
                  </td>
                </tr>
              )
            )}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-sm text-muted">
                  هنوز حسابی ساخته نشده
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card flex flex-wrap items-end gap-2 p-4">
        <div>
          <label className="field-label">نام اتلیه</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="field-input w-auto py-1.5 text-[13px]"
          />
        </div>
        <div>
          <label className="field-label">نام کاربری</label>
          <input
            value={newUser}
            onChange={(e) => setNewUser(e.target.value)}
            className="field-input w-auto py-1.5 text-[13px]"
            dir="ltr"
          />
        </div>
        <div>
          <label className="field-label">رمز عبور</label>
          <input
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            className="field-input w-auto py-1.5 text-[13px]"
            dir="ltr"
          />
        </div>
        <button
          onClick={create}
          className="whitespace-nowrap rounded-lg bg-navy px-4 py-2 text-[13px] font-bold text-white"
        >
          ایجاد
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { panelApi } from "@/lib/panelApi";

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");

  function load() {
    panelApi.listAtelierAccounts().then(setAccounts).catch(() => {});
  }
  useEffect(load, []);

  async function create() {
    await panelApi.createAtelierAccount(newUser, newPass);
    setNewUser(""); setNewPass("");
    load();
  }

  async function deactivate(id: string) {
    await panelApi.deactivateAtelierAccount(id);
    load();
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-extrabold text-navy">حساب‌های آتلیه</h1>
      <div className="card mb-4 overflow-x-auto p-0">
        <table className="table-panel min-w-[520px]">
          <thead>
            <tr>
              <th>نام کاربری</th>
              <th>نام</th>
              <th>وضعیت</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td className="font-mono2" dir="ltr">{a.username}</td>
                <td>{a.name}</td>
                <td>
                  {a.is_active ? (
                    <span className="text-xs font-bold text-green-600">فعال</span>
                  ) : (
                    <span className="text-xs text-muted">غیرفعال</span>
                  )}
                </td>
                <td>
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
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-sm text-muted">
                  هنوز حسابی ساخته نشده
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="card flex flex-wrap items-end gap-2 p-4">
        <div>
          <label className="field-label">نام کاربری</label>
          <input value={newUser} onChange={(e) => setNewUser(e.target.value)} className="field-input w-auto py-1.5 text-[13px]" dir="ltr" />
        </div>
        <div>
          <label className="field-label">رمز عبور</label>
          <input value={newPass} onChange={(e) => setNewPass(e.target.value)} className="field-input w-auto py-1.5 text-[13px]" dir="ltr" />
        </div>
        <button onClick={create} className="whitespace-nowrap rounded-lg bg-navy px-4 py-2 text-[13px] font-bold text-white">
          ایجاد
        </button>
      </div>
    </div>
  );
}

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
    <div className="card">
      <h2 className="text-xl font-extrabold mb-4">حساب‌های آتلیه</h2>
      <table className="w-full text-[13.5px] mb-4">
        <thead><tr className="text-muted text-xs"><th className="text-right py-2">نام کاربری</th><th className="text-right py-2">نام</th><th className="text-right py-2">وضعیت</th><th></th></tr></thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id} className="border-t border-line">
              <td className="py-2 font-mono2">{a.username}</td>
              <td className="py-2">{a.name}</td>
              <td className="py-2">{a.is_active ? <span className="text-green-600">فعال</span> : <span className="text-muted">غیرفعال</span>}</td>
              <td className="py-2">{a.is_active && <button onClick={() => deactivate(a.id)} className="btn-outline text-xs px-3 py-1">غیرفعال کن</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2">
        <input value={newUser} onChange={(e) => setNewUser(e.target.value)} placeholder="نام کاربری" className="field-input" />
        <input value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="رمز عبور" className="field-input" />
        <button onClick={create} className="btn-primary whitespace-nowrap">ایجاد</button>
      </div>
    </div>
  );
}

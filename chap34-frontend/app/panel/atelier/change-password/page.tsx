"use client";

import { useState } from "react";
import { panelApi } from "@/lib/panelApi";

export default function AtelierChangePasswordPage() {
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newPass !== confirm) {
      setMsg({ ok: false, text: "رمز جدید و تکرار آن یکسان نیستند" });
      return;
    }
    setLoading(true);
    try {
      await panelApi.atelierChangePassword?.(oldPass, newPass);
      setMsg({ ok: true, text: "رمز عبور با موفقیت تغییر کرد" });
      setOldPass("");
      setNewPass("");
      setConfirm("");
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "خطا" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-sm">
      <h1 className="mb-6 text-lg font-extrabold text-navy">تغییر رمز عبور</h1>

      <label className="mb-1 block text-sm font-bold text-navy">رمز فعلی</label>
      <input
        type="password"
        value={oldPass}
        onChange={(e) => setOldPass(e.target.value)}
        className="field-input mb-4"
      />
      <label className="mb-1 block text-sm font-bold text-navy">رمز جدید</label>
      <input
        type="password"
        value={newPass}
        onChange={(e) => setNewPass(e.target.value)}
        className="field-input mb-4"
      />
      <label className="mb-1 block text-sm font-bold text-navy">تکرار رمز جدید</label>
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="field-input mb-5"
      />

      {msg && (
        <p
          className={`mb-3 text-sm font-bold ${
            msg.ok ? "text-green-600" : "text-red-500"
          }`}
        >
          {msg.text}
        </p>
      )}

      <button disabled={loading} className="btn-primary w-full">
        {loading ? "در حال ذخیره..." : "ذخیره"}
      </button>
    </form>
  );
}

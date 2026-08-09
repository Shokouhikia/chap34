"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { panelApi } from "@/lib/panelApi";

export default function PanelLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await panelApi.login(username, password);
      if (data.role === "admin") {
        router.push("/panel/admin/dashboard");
      } else {
        router.push("/panel/atelier/orders");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ورود ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf9fc] px-4">
      <form onSubmit={submit} className="card w-full max-w-sm">
        <h1 className="mb-1 text-center text-xl font-extrabold text-navy">
          ورود پنل
        </h1>
        <p className="mb-6 text-center text-xs text-muted">
          مدیریت چاپ، سفارش‌ها و تنظیمات سیستم
        </p>

        <label className="mb-1 block text-sm font-bold text-navy">نام کاربری</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="field-input mb-4"
          autoFocus
        />

        <label className="mb-1 block text-sm font-bold text-navy">رمز عبور</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field-input mb-5"
        />

        {error && <p className="mb-3 text-sm font-bold text-red-500">{error}</p>}

        <button disabled={loading} className="btn-primary w-full">
          {loading ? "در حال ورود..." : "ورود"}
        </button>
      </form>
    </div>
  );
}

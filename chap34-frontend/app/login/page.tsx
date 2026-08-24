"use client";

import { Suspense } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, getPendingRedirect } from "@/lib/api";

// Render's free-tier cold start can take tens of seconds (see the retry
// budget in lib/api.ts); without this, a slow-but-succeeding request looks
// indistinguishable from a frozen button and people give up mid-wait.
const SLOW_HINT_DELAY_MS = 6000;

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || getPendingRedirect() || "/account";

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [slowHint, setSlowHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slowHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (slowHintTimer.current) clearTimeout(slowHintTimer.current);
    };
  }, []);

  async function submit() {
    if (!/^\d{11}$/.test(phone)) {
      setError("شماره موبایل باید ۱۱ رقم باشد");
      return;
    }
    setLoading(true);
    setSlowHint(false);
    setError(null);
    slowHintTimer.current = setTimeout(() => setSlowHint(true), SLOW_HINT_DELAY_MS);
    try {
      await api.requestOtp(phone);
      router.push(`/login/otp?phone=${phone}&redirect=${encodeURIComponent(redirect)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      if (slowHintTimer.current) clearTimeout(slowHintTimer.current);
      setSlowHint(false);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm text-center">
      <h2 className="mb-2 text-xl font-extrabold text-navy">
        برای مشاهده سفارشات، شماره موبایل خود را وارد کنید
      </h2>
      <p className="mb-6 text-sm text-muted">
        کد تأیید به این شماره ارسال می‌شود.
      </p>

      <input
        type="tel"
        inputMode="numeric"
        placeholder="۰۹۱۲xxxxxxx"
        maxLength={11}
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        className="field-input mb-4 text-center"
        dir="ltr"
      />

      {slowHint && (
        <p className="mb-3 text-sm font-bold text-purple-deep">
          سرور در حال بیدار شدن است، ممکن است تا ۴۰ ثانیه طول بکشد...
        </p>
      )}
      {error && <p className="mb-3 text-sm font-bold text-red-500">{error}</p>}

      <button onClick={submit} disabled={loading} className="btn-primary w-full">
        {loading ? "در حال ارسال..." : "دریافت کد تأیید"}
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

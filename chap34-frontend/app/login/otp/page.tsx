"use client";

import { Suspense } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, clearPendingRedirect, getPendingRedirect } from "@/lib/api";

const SLOW_HINT_DELAY_MS = 6000;

function LoginOtpPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";
  const redirect = searchParams.get("redirect") || getPendingRedirect() || "/account";

  const [digits, setDigits] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [slowHint, setSlowHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  // A ref (not the `loading` state) guards against the auto-submit effect
  // and a manual button tap both firing verifyOtp for the same code: state
  // updates aren't visible synchronously, so two calls in the same tick
  // could both see loading === false and race.
  const submittingRef = useRef(false);
  const slowHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (slowHintTimer.current) clearTimeout(slowHintTimer.current);
    };
  }, []);

  function updateDigit(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 3) inputsRef.current[index + 1]?.focus();
  }

  async function submit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setSlowHint(false);
    setError(null);
    slowHintTimer.current = setTimeout(() => setSlowHint(true), SLOW_HINT_DELAY_MS);
    try {
      await api.verifyOtp(phone, digits.join(""));
      clearPendingRedirect();
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "کد اشتباه است");
      submittingRef.current = false;
    } finally {
      if (slowHintTimer.current) clearTimeout(slowHintTimer.current);
      setSlowHint(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    const code = digits.join("");
    if (code.length === 4 && !digits.includes("") && !loading) {
      submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  return (
    <div className="mx-auto max-w-sm text-center">
      <h2 className="mb-2 text-xl font-extrabold text-navy">
        کد تأیید را وارد کنید
      </h2>
      <p className="mb-2 text-sm text-muted">
        کد ۴ رقمی ارسال‌شده به {phone}
      </p>
      <p className="mb-6 text-xs font-bold text-purple-deep">
        (دمو: کد همیشه ۱۲۳۴ است)
      </p>

      <div className="mb-6 flex justify-center gap-3" dir="ltr">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            value={d}
            onChange={(e) => updateDigit(i, e.target.value)}
            maxLength={1}
            inputMode="numeric"
            className="field-input h-14 w-12 text-center text-lg font-bold"
          />
        ))}
      </div>

      {slowHint && (
        <p className="mb-3 text-sm font-bold text-purple-deep">
          سرور در حال بیدار شدن است، ممکن است تا ۴۰ ثانیه طول بکشد...
        </p>
      )}
      {error && <p className="mb-3 text-sm font-bold text-red-500">{error}</p>}

      <button onClick={submit} disabled={loading} className="btn-primary mb-3 w-full">
        {loading ? "در حال بررسی..." : "تأیید و ادامه"}
      </button>
      <button
        onClick={() => api.requestOtp(phone)}
        className="text-sm font-bold text-muted"
      >
        ارسال مجدد کد
      </button>
    </div>
  );
}

export default function LoginOtpPage() {
  return (
    <Suspense fallback={null}>
      <LoginOtpPageInner />
    </Suspense>
  );
}

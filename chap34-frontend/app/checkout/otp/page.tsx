"use client";

import { Suspense } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { api } from "@/lib/api";

function OtpPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const photoId = searchParams.get("photoId") || "";
  const phone = searchParams.get("phone") || "";

  const [digits, setDigits] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  function updateDigit(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 3) inputsRef.current[index + 1]?.focus();
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await api.verifyOtp(phone, digits.join(""));
      router.push(`/checkout/print?photoId=${photoId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "کد اشتباه است");
    } finally {
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
      <p className="mb-6 text-sm text-muted">
        کد ۴ رقمی ارسال‌شده به {phone}
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

export default function OtpPage() {
  return (
    <Suspense fallback={null}>
      <OtpPageInner />
    </Suspense>
  );
}

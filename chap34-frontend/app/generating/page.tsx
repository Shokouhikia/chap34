"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { genderDraft } from "@/lib/draft";

const STEPS = ["اعمال پوشش انتخابی", "تنظیم پس‌زمینه", "آماده‌سازی خروجی نهایی"];

export default function GeneratingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const photoId = searchParams.get("photoId");
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!photoId) return;
    const draft = genderDraft.get();
    if (!draft) {
      router.push(`/gender-settings?photoId=${photoId}`);
      return;
    }

    const ticker = setInterval(() => {
      setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, 500);

    api
      .generatePhoto(photoId, {
        gender: draft.gender,
        outfit_type: draft.outfitType,
        background_color: draft.backgroundColor,
      })
      .then(() => {
        clearInterval(ticker);
        setActiveStep(STEPS.length);
        setTimeout(() => router.push(`/result?photoId=${photoId}`), 400);
      })
      .catch((err) => {
        clearInterval(ticker);
        setError(err instanceof Error ? err.message : "تولید عکس نهایی ناموفق بود");
      });

    return () => clearInterval(ticker);
  }, [photoId, router]);

  if (!photoId) {
    return <p className="text-center text-muted">عکسی برای پردازش پیدا نشد.</p>;
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-8 flex h-40 w-40 items-center justify-center rounded-full border-4 border-purple-tint border-t-purple">
        <span className="text-3xl">🪄</span>
      </div>
      <h2 className="mb-6 text-lg font-extrabold text-navy">
        در حال ساخت عکس نهایی با هوش مصنوعی...
      </h2>
      <ul className="mx-auto max-w-xs space-y-2 text-right text-sm">
        {STEPS.map((step, i) => (
          <li
            key={step}
            className={`flex items-center gap-2 ${
              i < activeStep ? "text-navy font-bold" : "text-muted"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                i < activeStep ? "bg-success text-white" : "bg-purple-tint text-purple-deep"
              }`}
            >
              {i < activeStep ? "✓" : "…"}
            </span>
            {step}
          </li>
        ))}
      </ul>
      {error && <p className="mt-6 text-sm font-bold text-red-500">{error}</p>}
    </div>
  );
}

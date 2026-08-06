"use client";

import { Suspense } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { genderDraft } from "@/lib/draft";

function ProcessingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const photoId = searchParams.get("photoId");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!photoId) return;

    api
      .detectGender(photoId)
      .then((data) => {
        genderDraft.set({
          gender: data.gender,
          outfitType: "no_change",
          backgroundColor: "white",
        });
        router.push(`/gender-settings?photoId=${photoId}`);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "تشخیص جنسیت ناموفق بود");
      });
  }, [photoId, router]);

  if (!photoId) {
    return <p className="text-center text-muted">عکسی برای پردازش پیدا نشد.</p>;
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-8 flex h-40 w-40 items-center justify-center rounded-full border-4 border-purple-tint border-t-purple">
        <span className="text-3xl">🧠</span>
      </div>
      <h2 className="mb-2 text-lg font-extrabold text-navy">
        در حال تشخیص جنسیت شما با هوش مصنوعی...
      </h2>
      <p className="text-sm text-muted">
        این فقط چند لحظه طول می‌کشد.
      </p>
      {error && <p className="mt-6 text-sm font-bold text-red-500">{error}</p>}
    </div>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={null}>
      <ProcessingPageInner />
    </Suspense>
  );
}

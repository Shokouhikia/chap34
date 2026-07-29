"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { printDraft } from "@/lib/draft";

export default function AddressPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const photoId = searchParams.get("photoId") || "";

  const [form, setForm] = useState({
    full_name: "",
    province: "",
    city: "",
    full_address: "",
    postal_code: "",
    phone: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const draft = printDraft.get();
    if (draft) {
      setForm({
        full_name: draft.fullName || "",
        province: draft.province || "",
        city: draft.city || "",
        full_address: draft.fullAddress || "",
        postal_code: draft.postalCode || "",
        phone: draft.phone || "",
      });
    }
  }, []);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    if (Object.values(form).some((v) => !v)) {
      setError("لطفاً همه فیلدها را پر کنید");
      return;
    }
    printDraft.update({
      fullName: form.full_name,
      province: form.province,
      city: form.city,
      fullAddress: form.full_address,
      postalCode: form.postal_code,
      phone: form.phone,
    });
    router.push(`/checkout/summary?photoId=${photoId}`);
  }

  return (
    <div className="mx-auto max-w-sm">
      <h2 className="mb-6 text-center text-xl font-extrabold text-navy">
        اطلاعات پستی
      </h2>

      <div className="space-y-3">
        <input
          placeholder="نام و نام خانوادگی"
          className="field-input"
          value={form.full_name}
          onChange={(e) => update("full_name", e.target.value)}
        />
        <div className="flex gap-3">
          <input
            placeholder="استان"
            className="field-input"
            value={form.province}
            onChange={(e) => update("province", e.target.value)}
          />
          <input
            placeholder="شهر"
            className="field-input"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
          />
        </div>
        <input
          placeholder="آدرس کامل"
          className="field-input"
          value={form.full_address}
          onChange={(e) => update("full_address", e.target.value)}
        />
        <div className="flex gap-3">
          <input
            placeholder="کد پستی"
            className="field-input"
            dir="ltr"
            value={form.postal_code}
            onChange={(e) => update("postal_code", e.target.value)}
          />
          <input
            placeholder="شماره تماس"
            className="field-input"
            dir="ltr"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 text-center text-sm font-bold text-red-500">{error}</p>
      )}

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => router.push(`/checkout/print?photoId=${photoId}`)}
          className="btn-outline flex-1"
        >
          بازگشت به مرحله قبل
        </button>
        <button onClick={submit} className="btn-primary flex-1">
          ادامه
        </button>
      </div>
    </div>
  );
}

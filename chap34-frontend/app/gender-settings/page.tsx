"use client";

import { Suspense } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, Gender } from "@/lib/api";
import { genderDraft } from "@/lib/draft";

const MALE_OPTIONS = [
  { value: "no_change", label: "بدون تغییر", icon: "🚫" },
  { value: "blazer", label: "کت رسمی", icon: "🧥" },
  { value: "shirt", label: "پیراهن", icon: "👔" },
  { value: "suit", label: "کت و شلوار", icon: "🤵" },
  { value: "tshirt", label: "تی‌شرت", icon: "👕" },
];

const FEMALE_OPTIONS = [
  { value: "no_change", label: "بدون تغییر", icon: "🚫" },
  { value: "no_hijab", label: "بدون حجاب", icon: "👩" },
  { value: "maghnaeh", label: "مغنه", icon: "🧕" },
  { value: "shawl", label: "شال", icon: "🧣" },
  { value: "scarf", label: "روسری", icon: "🎀" },
];

const BACKGROUNDS = [
  { value: "white", label: "سفید", color: "#ffffff" },
  { value: "blue", label: "آبی", color: "#cfe0ff" },
  { value: "gray", label: "طوسی", color: "#e6e6e6" },
];

type Photo = {
  id: string;
  original_file_url: string;
  detected_gender?: Gender | null;
};

function GenderSettingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const photoId = searchParams.get("photoId") || "";

  const [photo, setPhoto] = useState<Photo | null>(null);
  // Gender is decided automatically by the AI; it is not user-selectable.
  const [gender, setGender] = useState<Gender>("male");
  const [outfit, setOutfit] = useState("no_change");
  const [background, setBackground] = useState("white");

  useEffect(() => {
    if (!photoId) return;
    api
      .getPhoto(photoId)
      .then((p: Photo) => {
        setPhoto(p);
        if (p.detected_gender) setGender(p.detected_gender);
      })
      .catch(() => {});
    const draft = genderDraft.get();
    if (draft) {
      setGender(draft.gender);
      setOutfit(draft.outfitType);
      setBackground(draft.backgroundColor);
    }
  }, [photoId]);

  const options = gender === "male" ? MALE_OPTIONS : FEMALE_OPTIONS;

  function continueToGenerate() {
    genderDraft.set({ gender, outfitType: outfit, backgroundColor: background });
    router.push(`/generating?photoId=${photoId}`);
  }

  return (
    <div className="mx-auto max-w-sm">
      <h2 className="mb-1 text-center text-xl font-extrabold text-navy">
        تنظیمات ظاهری عکس
      </h2>
      <p className="sub mb-5 text-center text-sm text-muted">
        استایل و ظاهر مورد نظر خود را انتخاب کنید.
      </p>

      <div className="mx-auto mb-5 w-40 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        {photo?.original_file_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={api.fileUrl(photo.original_file_url)}
            alt="عکس آپلودشده"
            className="aspect-[3/4] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center text-xs text-muted">
            در حال بارگذاری...
          </div>
        )}
      </div>

      <div className="mb-5 flex items-center justify-center gap-2 rounded-full border border-line bg-purple-tint px-4 py-2.5 text-sm font-bold text-purple-deep">
        <span>جنسیت تشخیص‌داده‌شده:</span>
        <span>{gender === "male" ? "مرد" : "زن"}</span>
      </div>

      <label className="mb-2 block text-xs font-bold text-navy">نوع پوشش</label>
      <div className="mb-5 space-y-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setOutfit(opt.value)}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold ${
              outfit === opt.value
                ? "border-purple bg-purple-tint text-navy"
                : "border-line text-navy"
            }`}
          >
            <span className="text-lg">{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>

      <label className="mb-2 block text-xs font-bold text-navy">رنگ پس‌زمینه</label>
      <div className="mb-6 flex gap-3">
        {BACKGROUNDS.map((bg) => (
          <button
            key={bg.value}
            onClick={() => setBackground(bg.value)}
            title={bg.label}
            className={`h-9 w-9 rounded-full border-2 ${
              background === bg.value ? "border-purple ring-2 ring-purple-tint" : "border-line"
            }`}
            style={{ background: bg.color }}
          />
        ))}
      </div>

      <button onClick={continueToGenerate} className="btn-primary w-full">
        ساخت عکس نهایی
      </button>
    </div>
  );
}

export default function GenderSettingsPage() {
  return (
    <Suspense fallback={null}>
      <GenderSettingsPageInner />
    </Suspense>
  );
}

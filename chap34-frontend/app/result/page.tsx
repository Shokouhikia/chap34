"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Photo = {
  id: string;
  result_file_url: string | null;
  status: string;
};

export default function ResultPage() {
  const searchParams = useSearchParams();
  const photoId = searchParams.get("photoId");
  const [photo, setPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    if (!photoId) return;
    api.getPhoto(photoId).then(setPhoto).catch(() => {});
  }, [photoId]);

  if (!photoId) {
    return <p className="text-center text-muted">عکسی پیدا نشد.</p>;
  }

  return (
    <div className="text-center">
      <h2 className="mb-6 text-xl font-extrabold text-navy">
        عکس پرسنلی شما آماده است
      </h2>

      <div className="mx-auto mb-6 aspect-[3/4] w-56 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        {photo?.result_file_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={api.fileUrl(photo.result_file_url)}
            alt="عکس پرسنلی نهایی"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            در حال بارگذاری...
          </div>
        )}
      </div>

      <div className="mb-3 flex justify-center gap-3">
        <Link href="/capture?mode=gallery" className="btn-outline">
          تولید مجدد
        </Link>
        <Link href={`/gender-settings?photoId=${photoId}`} className="btn-outline">
          ویرایش تنظیمات
        </Link>
      </div>

      {photo?.result_file_url && (
        <div className="mb-8 flex gap-3">
          <a
            href={api.fileUrl(photo.result_file_url)}
            download
            className="btn-primary flex-1"
          >
            ⬇ دانلود
          </a>
          <button
            onClick={() => alert("لینک اشتراک‌گذاری کپی شد. (نمونه)")}
            className="btn-outline flex-1"
          >
            🔗 اشتراک‌گذاری
          </button>
        </div>
      )}

      <div className="card mt-6 bg-navy text-center text-white">
        <p className="mb-3 text-sm font-bold text-purple-tint">
          نسخه چاپی می‌خواهید؟
        </p>
        <Link
          href={`/checkout/phone?photoId=${photoId}`}
          className="inline-block rounded-full bg-white px-6 py-3 text-sm font-bold text-navy"
        >
          سفارش چاپ و ارسال به آدرس من
        </Link>
      </div>
    </div>
  );
}

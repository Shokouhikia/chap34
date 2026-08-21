"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { userApi, type UserPhoto } from "@/lib/userApi";

// Both actions share this look (gradient pill, matching .btn-primary's
// visual language) so "سفارش چاپ عکس" and "دانلود" read as equally-weighted
// actions, sized to fit the narrow photo-grid card.
const CARD_BUTTON =
  "flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-l from-purple to-purple-deep px-2 py-2 text-[11px] font-bold text-white shadow-md shadow-purple/25 transition hover:-translate-y-0.5";

export default function PhotosTab() {
  const [photos, setPhotos] = useState<UserPhoto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    userApi
      .getMyPhotos()
      .then(setPhotos)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "خطای ناشناخته");
        setPhotos([]);
      });
  }, []);

  if (photos === null) {
    return <p className="text-center text-sm text-muted">در حال بارگذاری...</p>;
  }

  if (error) {
    return <p className="text-center text-sm font-bold text-red-500">{error}</p>;
  }

  if (photos.length === 0) {
    return (
      <div className="card text-center">
        <p className="mb-4 text-sm text-muted">هنوز عکس پرسنلی‌ای نساخته‌ای.</p>
        <Link href="/capture" className="btn-primary">
          ساخت عکس ۳×۴
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {photos.map((photo) => (
        <div key={photo.id} className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="aspect-[3/4] overflow-hidden bg-purple-tint/40">
            <img
              src={api.fileUrl(photo.result_file_url)}
              alt="عکس پرسنلی"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="border-t border-line p-2.5">
            <p className="mb-2 text-center text-[11px] text-muted">
              {new Date(photo.created_at).toLocaleDateString("fa-IR")}
            </p>
            <div className="flex flex-col gap-1.5">
              {/* Already-logged-in users skip straight past /checkout/phone
                  to /checkout/print (see that page's auto-redirect), so this
                  drops the user right into the real order flow. */}
              <Link href={`/checkout/phone?photoId=${photo.id}`} className={CARD_BUTTON}>
                سفارش چاپ عکس 🛒
              </Link>
              <a href={api.fileUrl(photo.result_file_url)} download className={CARD_BUTTON}>
                دانلود ↓
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { userApi, type UserPhoto } from "@/lib/userApi";

export default function PhotosTab() {
  const [photos, setPhotos] = useState<UserPhoto[] | null>(null);

  useEffect(() => {
    userApi.getMyPhotos().then(setPhotos);
  }, []);

  if (photos === null) {
    return <p className="text-center text-sm text-muted">در حال بارگذاری...</p>;
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
              src={photo.result_file_url}
              alt="عکس پرسنلی"
              className="h-full w-full object-cover"
            />
          </div>
          <a
            href={photo.result_file_url}
            download
            className="flex items-center justify-center gap-1.5 border-t border-line py-2.5 text-xs font-bold text-purple-deep transition hover:bg-purple-tint"
          >
            ⬇ دانلود
          </a>
        </div>
      ))}
    </div>
  );
}

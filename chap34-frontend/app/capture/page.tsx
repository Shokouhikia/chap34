"use client";

import { Suspense } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { NoFaceDetectedError, preprocessPhoto } from "@/lib/photoPreprocess";

function CapturePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "camera" ? "camera" : "gallery";

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preparing, setPreparing] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPreparing(true);
    try {
      const { blob, gender, genderConfidence } = await preprocessPhoto(file);
      setPreparing(false);
      setUploading(true);
      const data = await api.uploadPhoto(blob, gender, genderConfidence);
      router.push(`/processing?photoId=${data.photo_id}`);
    } catch (err) {
      setError(
        err instanceof NoFaceDetectedError
          ? err.message
          : err instanceof Error
          ? err.message
          : "خطای ناشناخته"
      );
      setPreparing(false);
      setUploading(false);
    }
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-extrabold text-navy">
        عکس‌تان را انتخاب کنید
      </h2>
      <p className="mb-8 text-sm text-muted">
        برای ساخت عکس پرسنلی، یکی از راه‌های زیر را انتخاب کنید.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading || preparing}
          className={`card flex flex-col items-center gap-3 py-10 transition hover:border-purple ${
            mode === "camera" ? "border-purple" : ""
          }`}
        >
          <span className="text-3xl">📷</span>
          <b className="text-sm text-navy">گرفتن عکس با دوربین</b>
        </button>

        <button
          onClick={() => galleryInputRef.current?.click()}
          disabled={uploading || preparing}
          className={`card flex flex-col items-center gap-3 py-10 transition hover:border-purple ${
            mode === "gallery" ? "border-purple" : ""
          }`}
        >
          <span className="text-3xl">🖼️</span>
          <b className="text-sm text-navy">انتخاب از گالری</b>
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {preparing && (
        <p className="mt-6 text-center text-sm text-muted">
          در حال آماده‌سازی عکس...
        </p>
      )}
      {uploading && (
        <p className="mt-6 text-center text-sm text-muted">در حال آپلود...</p>
      )}
      {error && (
        <p className="mt-6 text-center text-sm font-bold text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

export default function CapturePage() {
  return (
    <Suspense fallback={null}>
      <CapturePageInner />
    </Suspense>
  );
}

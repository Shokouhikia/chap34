"use client";

/**
 * KYC-style live camera capture: shows the front camera feed with an oval
 * guide overlay that turns from purple to green once a face is detected
 * inside it, and only then enables the capture button. Falls back to the
 * caller's own handling (native file input) via `onFallback` when
 * getUserMedia isn't available or permission is denied.
 */
import * as faceapi from "face-api.js";
import { useEffect, useRef, useState } from "react";
import { loadModels } from "@/lib/photoPreprocess";

const DETECT_INTERVAL_MS = 250;
const DETECT_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,
  scoreThreshold: 0.5,
});

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onFallback: (message: string) => void;
  onCancel: () => void;
}

export default function CameraCapture({ onCapture, onFallback, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectingRef = useRef(false);
  const onFallbackRef = useRef(onFallback);
  onFallbackRef.current = onFallback;

  const [streamReady, setStreamReady] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);

  // Acquire the front camera once on mount; release it on unmount or when
  // this component is swapped out (e.g. navigation away, or the parent
  // hiding it once a frame has been captured).
  useEffect(() => {
    let cancelled = false;
    let localStream: MediaStream | null = null;

    async function start() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        onFallbackRef.current("مرورگر شما از دسترسی زنده به دوربین پشتیبانی نمی‌کند.");
        return;
      }
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          localStream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) videoRef.current.srcObject = localStream;
        setStreamReady(true);
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        if (name === "NotAllowedError") {
          onFallbackRef.current(
            "دسترسی به دوربین رد شد. لطفاً از این روش استفاده کنید یا دسترسی دوربین را در تنظیمات مرورگر فعال کنید."
          );
        } else if (name === "NotFoundError") {
          onFallbackRef.current("دوربینی روی این دستگاه پیدا نشد.");
        } else {
          onFallbackRef.current("امکان دسترسی به دوربین وجود ندارد.");
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      localStream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Load the shared face-api.js models (same cache as preprocessPhoto).
  useEffect(() => {
    let cancelled = false;
    loadModels()
      .then(() => {
        if (!cancelled) setModelsReady(true);
      })
      .catch(() => {
        if (!cancelled) onFallbackRef.current("بارگذاری مدل تشخیص چهره ناموفق بود.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Throttled face detection: polls the current video frame every ~250ms
  // instead of every animation frame, and skips a tick if the previous
  // detection call is still in flight.
  useEffect(() => {
    if (!streamReady || !modelsReady) return;

    const id = setInterval(async () => {
      if (detectingRef.current) return;
      const videoEl = videoRef.current;
      if (!videoEl || videoEl.readyState < 2) return;

      detectingRef.current = true;
      try {
        const detection = await faceapi.detectSingleFace(videoEl, DETECT_OPTIONS);
        if (!detection) {
          setFaceDetected(false);
          return;
        }
        const vw = videoEl.videoWidth;
        const vh = videoEl.videoHeight;
        const { x, y, width, height } = detection.box;
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const centered = centerX > vw * 0.25 && centerX < vw * 0.75 && centerY > vh * 0.2 && centerY < vh * 0.8;
        const wellSized = width > vw * 0.18 && width < vw * 0.9;
        setFaceDetected(centered && wellSized);
      } catch {
        setFaceDetected(false);
      } finally {
        detectingRef.current = false;
      }
    }, DETECT_INTERVAL_MS);

    return () => clearInterval(id);
  }, [streamReady, modelsReady]);

  function handleCapture() {
    const videoEl = videoRef.current;
    if (!videoEl || !faceDetected) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.92
    );
  }

  const ready = streamReady && modelsReady;

  return (
    <div className="flex flex-col items-center">
      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-lg2 bg-navy">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover [transform:scaleX(-1)]"
        />
        <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 h-full w-full">
          <ellipse
            cx="150"
            cy="190"
            rx="108"
            ry="148"
            fill="none"
            stroke={faceDetected ? "#1fa971" : "#e7e4f4"}
            strokeWidth="6"
            style={{ transition: "stroke 300ms ease" }}
          />
        </svg>
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-navy/60">
            <p className="text-sm font-bold text-white">در حال آماده‌سازی دوربین...</p>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-sm text-muted">
        {ready
          ? faceDetected
            ? "چهره‌ی شما به‌خوبی در کادر قرار گرفت"
            : "چهره‌ی خود را داخل کادر قرار دهید"
          : "لطفاً چند لحظه صبر کنید"}
      </p>

      <button
        onClick={handleCapture}
        disabled={!faceDetected}
        className="btn-primary mt-5 w-full max-w-sm disabled:opacity-40"
      >
        گرفتن عکس
      </button>

      <button
        onClick={onCancel}
        className="mt-3 text-xs font-bold text-muted hover:text-navy"
      >
        بازگشت به روش‌های دیگر
      </button>
    </div>
  );
}

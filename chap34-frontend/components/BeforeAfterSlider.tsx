"use client";

import { useRef, useState, useCallback } from "react";

export default function BeforeAfterSlider({
  beforeSrc, afterSrc, beforeLabel = "قبل", afterLabel = "بعد",
}: { beforeSrc: string; afterSrc: string; beforeLabel?: string; afterLabel?: string }) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, pct)));
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[320px] aspect-[4/5] rounded-lg2 overflow-hidden select-none shadow-[0_20px_40px_-20px_rgba(18,20,58,0.3)] border border-line cursor-ew-resize"
      onMouseDown={(e) => { dragging.current = true; updateFromClientX(e.clientX); }}
      onMouseMove={(e) => { if (dragging.current) updateFromClientX(e.clientX); }}
      onMouseUp={() => { dragging.current = false; }}
      onMouseLeave={() => { dragging.current = false; }}
      onTouchStart={(e) => updateFromClientX(e.touches[0].clientX)}
      onTouchMove={(e) => updateFromClientX(e.touches[0].clientX)}
    >
      <img src={afterSrc} alt={afterLabel} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      <img
        src={beforeSrc}
        alt={beforeLabel}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false}
      />
      <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md pointer-events-none" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-ink text-xs font-bold">
          ↔
        </div>
      </div>
      <span className="absolute top-3 right-3 bg-ink/80 text-white text-[11px] font-bold px-2.5 py-1 rounded-full pointer-events-none">{afterLabel}</span>
      <span className="absolute top-3 left-3 bg-white/85 text-ink text-[11px] font-bold px-2.5 py-1 rounded-full pointer-events-none">{beforeLabel}</span>
    </div>
  );
}

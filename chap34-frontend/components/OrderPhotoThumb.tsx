"use client";

import { panelApi } from "@/lib/panelApi";

/**
 * Small 3:4 preview of an order's finished photo, so staff can tell at a
 * glance which person a row/card belongs to. Renders a neutral placeholder
 * when the order has no generated photo yet (seeded demo orders, or a
 * generation that failed), so grid alignment never breaks.
 */
export default function OrderPhotoThumb({
  photoUrl,
  size = "sm",
  alt = "",
}: {
  photoUrl?: string | null;
  size?: "sm" | "md";
  alt?: string;
}) {
  // 3:4 boxes, matching the printed piece's aspect ratio.
  const box = size === "md" ? "w-12 h-16" : "w-9 h-12";
  const base = `${box} shrink-0 rounded-md2 border border-line object-cover`;

  if (!photoUrl) {
    return (
      <div
        className={`${box} shrink-0 rounded-md2 border border-line bg-purple-tint/40 flex items-center justify-center`}
        title="عکس نهایی موجود نیست"
      >
        <span className="text-[10px] text-muted">—</span>
      </div>
    );
  }

  return <img src={panelApi.fileUrl(photoUrl)} alt={alt} className={base} />;
}

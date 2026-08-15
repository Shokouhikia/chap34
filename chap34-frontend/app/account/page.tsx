"use client";

import { Suspense } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import OrdersTab from "@/components/account/OrdersTab";
import PhotosTab from "@/components/account/PhotosTab";

const TABS = [
  { key: "photos", label: "عکس‌های من" },
  { key: "orders", label: "سفارش‌های من" },
] as const;

function AccountPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "orders" ? "orders" : "photos";

  return (
    <div>
      <div className="mb-6 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => router.push(`/account?tab=${t.key}`)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              tab === t.key
                ? "bg-purple text-white"
                : "text-muted hover:bg-purple-tint hover:text-purple-deep"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "photos" ? <PhotosTab /> : <OrdersTab />}
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountPageInner />
    </Suspense>
  );
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearOpsSession, getOpsName, getOpsToken } from "@/lib/opsApi";

const NAV = [
  { href: "/ops/dashboard", label: "داشبورد" },
  { href: "/ops/orders", label: "سفارش‌ها" },
  { href: "/ops/batches", label: "بچ‌های چاپ" },
  { href: "/ops/qc", label: "کنترل کیفیت" },
  { href: "/ops/sorting", label: "تفکیک" },
  { href: "/ops/packing", label: "بسته‌بندی" },
  { href: "/ops/shipments", label: "ارسال" },
];

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const isLogin = pathname === "/ops/login";

  useEffect(() => {
    if (isLogin) {
      setReady(true);
      return;
    }
    if (!getOpsToken()) {
      router.replace("/ops/login");
      return;
    }
    setName(getOpsName());
    setReady(true);
  }, [isLogin, router, pathname]);

  if (!ready) return null;
  if (isLogin) return <>{children}</>;

  function logout() {
    clearOpsSession();
    router.replace("/ops/login");
  }

  return (
    <div className="min-h-screen bg-[#faf9fc]">
      <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-3">
          <span className="text-lg font-extrabold text-navy">پنل عملیات چاپخانه</span>
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-navy">{name}</span>
            <button onClick={logout} className="text-sm font-bold text-red-500">
              خروج
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
                pathname.startsWith(n.href)
                  ? "bg-purple text-white"
                  : "text-muted hover:bg-purple-tint hover:text-purple-deep"
              }`}
            >
              {n.label}
            </a>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

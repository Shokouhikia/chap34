"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearPanelSession, getPanelName, getPanelRole, getPanelToken } from "@/lib/panelApi";

const ADMIN_NAV = [
  { href: "/panel/admin/dashboard", label: "داشبورد" },
  { href: "/panel/admin/orders", label: "سفارش‌ها" },
  { href: "/panel/admin/customers", label: "مشتری‌ها" },
  { href: "/panel/admin/settings", label: "تنظیمات" },
  { href: "/panel/admin/accounts", label: "حساب‌ها" },
];

const ATELIER_NAV = [
  { href: "/panel/atelier/orders", label: "سفارش‌ها" },
  { href: "/panel/atelier/batches", label: "بچ‌های چاپ" },
  { href: "/panel/atelier/packing", label: "بسته‌بندی" },
  { href: "/panel/atelier/shipments", label: "ارسال" },
  { href: "/panel/atelier/change-password", label: "تغییر رمز" },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const isLogin = pathname === "/panel/login";

  useEffect(() => {
    if (isLogin) {
      setReady(true);
      return;
    }
    if (!getPanelToken()) {
      router.replace("/panel/login");
      return;
    }
    setName(getPanelName());
    setRole(getPanelRole());
    setReady(true);
  }, [isLogin, router, pathname]);

  if (!ready) return null;
  if (isLogin) return <>{children}</>;

  const nav = role === "admin" ? ADMIN_NAV : ATELIER_NAV;

  function logout() {
    clearPanelSession();
    router.replace("/panel/login");
  }

  return (
    <div className="min-h-screen bg-[#faf9fc]">
      <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-3">
          <span className="text-lg font-extrabold text-navy">
            {role === "admin" ? "پنل مدیریت" : "پنل آتلیه"}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-navy">{name}</span>
            <button onClick={logout} className="text-sm font-bold text-red-500">
              خروج
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2">
          {nav.map((n) => (
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

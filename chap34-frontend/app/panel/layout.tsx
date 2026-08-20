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
  { href: "/panel/atelier/report", label: "گزارش سفارشات" },
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
    <div className="flex min-h-screen bg-[#faf9fc]">
      {/* RTL: aside comes first in the DOM and lands on the right. Hidden on
          narrow screens, where the horizontal nav below takes over. */}
      <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col border-l border-line bg-white lg:flex">
        <div className="border-b border-line px-4 py-3">
          <div className="text-base font-extrabold text-navy">
            {role === "admin" ? "پنل مدیریت" : "پنل آتلیه"}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted">{name}</div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className={`rounded-lg px-3 py-2 text-[13px] font-bold transition ${
                pathname.startsWith(n.href)
                  ? "bg-purple text-white"
                  : "text-navy hover:bg-purple-tint hover:text-purple-deep"
              }`}
            >
              {n.label}
            </a>
          ))}
        </nav>

        <button
          onClick={logout}
          className="border-t border-line px-4 py-3 text-right text-[13px] font-bold text-red-500 hover:bg-red-50"
        >
          خروج
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Compact top bar - carries the nav on screens too narrow for the
            sidebar, and the logout affordance that lives in the sidebar on
            desktop. */}
        <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-base font-extrabold text-navy">
              {role === "admin" ? "پنل مدیریت" : "پنل آتلیه"}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-navy">{name}</span>
              <button onClick={logout} className="text-xs font-bold text-red-500">
                خروج
              </button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition ${
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

        <main className="min-w-0 flex-1 px-5 py-5">{children}</main>
      </div>
    </div>
  );
}

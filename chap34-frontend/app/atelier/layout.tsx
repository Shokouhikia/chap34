"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  clearAtelierSession,
  getAtelierName,
  getAtelierToken,
} from "@/lib/atelierApi";

export default function AtelierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const isLogin = pathname === "/atelier/login";

  useEffect(() => {
    if (isLogin) {
      setReady(true);
      return;
    }
    if (!getAtelierToken()) {
      router.replace("/atelier/login");
      return;
    }
    setName(getAtelierName());
    setReady(true);
  }, [isLogin, router, pathname]);

  if (!ready) return null;
  if (isLogin) return <>{children}</>;

  function logout() {
    clearAtelierSession();
    router.replace("/atelier/login");
  }

  return (
    <div className="min-h-screen bg-[#faf9fc]">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-white/90 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-6">
          <span className="text-lg font-extrabold text-navy">پنل آتلیه</span>
          <nav className="flex gap-4 text-sm font-bold">
            <a
              href="/atelier/orders"
              className={
                pathname.startsWith("/atelier/orders")
                  ? "text-purple"
                  : "text-muted hover:text-navy"
              }
            >
              سفارش‌ها
            </a>
            <a
              href="/atelier/change-password"
              className={
                pathname === "/atelier/change-password"
                  ? "text-purple"
                  : "text-muted hover:text-navy"
              }
            >
              تغییر رمز
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-navy">{name}</span>
          <button onClick={logout} className="text-sm font-bold text-red-500">
            خروج
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

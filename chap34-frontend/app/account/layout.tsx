"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAccessToken, isLoggedIn, savePendingRedirect } from "@/lib/api";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      savePendingRedirect(pathname);
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setReady(true);
  }, [pathname, router]);

  if (!ready) return null;

  function logout() {
    clearAccessToken();
    router.replace("/");
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-navy">سفارشات من</h1>
        <button onClick={logout} className="text-sm font-bold text-red-500">
          خروج
        </button>
      </div>
      {children}
    </div>
  );
}

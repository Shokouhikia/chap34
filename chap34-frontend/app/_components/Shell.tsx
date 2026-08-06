"use client";

import { usePathname } from "next/navigation";

// The atelier + operations panels are full-bleed staff apps with their own
// top bars, so they opt out of the customer chrome (logo header + narrow
// centered main). Everything else keeps the customer shell.
export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPanel = pathname?.startsWith("/atelier") || pathname?.startsWith("/ops");

  if (isPanel) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-line bg-white/80 px-6 py-4 backdrop-blur">
        <a href="/" className="flex items-center gap-2 text-lg font-extrabold text-navy">
          Chap34
        </a>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">{children}</main>
    </>
  );
}

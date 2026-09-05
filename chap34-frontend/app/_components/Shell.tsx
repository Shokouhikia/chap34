"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Footer from "./Footer";
import type { BusinessInfo } from "@/lib/content";

// Marketing nav links shown on the home page header.
const NAV_LINKS: { label: string; href: string }[] = [{ label: "سفارشات من", href: "/account" }];

// The staff panel is a full-bleed desktop app with its own sidebar, so it
// opts out of the customer chrome (logo header + narrow centered main).
// Everything else keeps the customer shell.
//
// This used to test for "/atelier" and "/ops", which stopped matching when
// the panels moved under "/panel/..." - the result was the customer shell
// wrapping the panel and its max-w-3xl clamping the panel's own width, which
// is what made the staff app feel cramped/mobile on desktop.
export default function Shell({ children, businessInfo }: { children: React.ReactNode; businessInfo: BusinessInfo }) {
  const pathname = usePathname();
  const isPanel = pathname?.startsWith("/panel");
  const isHome = pathname === "/";

  if (isPanel) {
    return <>{children}</>;
  }

  if (isHome) {
    return (
      <>
        <header className="sticky top-0 z-50 border-b border-line bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
            <Link href="/" className="shrink-0 text-lg font-extrabold text-navy">
              Chap34
            </Link>
            <nav className="flex items-center gap-4 text-[12.5px] font-semibold text-navy/70 sm:gap-6 sm:text-[13.5px]">
              <Link href="/" className="border-b-2 border-purple-deep pb-1 text-purple-deep">
                خانه
              </Link>
              {NAV_LINKS.map((item) => (
                <Link key={item.label} href={item.href} className="pb-1 transition hover:text-navy">
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link
              href="/capture"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-l from-purple to-purple-deep px-5 py-2.5 text-[13px] font-bold text-white shadow-md shadow-purple/25 transition hover:-translate-y-0.5"
            >
              شروع کن ↞
            </Link>
          </div>
        </header>
        <main className="w-full">{children}</main>
        <Footer info={businessInfo} />
      </>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-line bg-white/80 px-6 py-4 backdrop-blur">
        <a href="/" className="flex items-center gap-2 text-lg font-extrabold text-navy">
          Chap34
        </a>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">{children}</main>
      <Footer info={businessInfo} />
    </>
  );
}

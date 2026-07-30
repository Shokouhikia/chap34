import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";

const vazir = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-vazir",
  weight: ["400", "500", "700", "800"],
});

export const metadata: Metadata = {
  title: "Chap34 — عکس پرسنلی با هوش مصنوعی",
  description: "یک عکس بگیر یا آپلود کن؛ هوش مصنوعی عکس پرسنلی استانداردت را آماده می‌کند.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${vazir.variable} font-vazir`}>
        <header className="sticky top-0 z-50 flex items-center justify-between border-b border-line bg-white/80 px-6 py-4 backdrop-blur">
          <a href="/" className="flex items-center gap-2 text-lg font-extrabold text-navy">
            Chap34
          </a>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-10">{children}</main>
      </body>
    </html>
  );
}

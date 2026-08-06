import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import Shell from "./_components/Shell";

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
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}

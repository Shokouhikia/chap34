import Link from "next/link";
import { IconInstagram } from "@/components/icons";
import type { BusinessInfo } from "@/lib/content";

const LEGAL_LINKS: { label: string; href: string }[] = [
  { label: "درباره ما", href: "/about" },
  { label: "تماس با ما", href: "/contact" },
  { label: "پیگیری سفارش", href: "/track-order" },
  { label: "قوانین و مقررات", href: "/terms" },
  { label: "حریم خصوصی", href: "/privacy" },
  { label: "شرایط استفاده از تصاویر کاربران", href: "/user-content-terms" },
  { label: "قوانین لغو سفارش و بازگشت وجه", href: "/refund-policy" },
];

export default function Footer({ info }: { info: BusinessInfo }) {
  return (
    <footer className="mt-6 border-t border-line px-5 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div>
            <span className="text-lg font-extrabold text-navy">Chap34</span>
            <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-muted">
              سرویس ساخت عکس پرسنلی استاندارد ۳×۴ با هوش مصنوعی و امکان سفارش چاپ.
            </p>

            {(info.biz_phone || info.biz_email || info.biz_address) && (
              <ul className="mt-4 space-y-1 text-[12.5px] text-muted">
                {info.biz_phone && (
                  <li>
                    تلفن:{" "}
                    <a href={`tel:${info.biz_phone}`} className="hover:text-navy" dir="ltr">
                      {info.biz_phone}
                    </a>
                  </li>
                )}
                {info.biz_email && (
                  <li>
                    ایمیل:{" "}
                    <a href={`mailto:${info.biz_email}`} className="hover:text-navy" dir="ltr">
                      {info.biz_email}
                    </a>
                  </li>
                )}
                {info.biz_address && <li>آدرس: {info.biz_address}</li>}
              </ul>
            )}

            {info.biz_instagram && (
              <a
                href={info.biz_instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="اینستاگرام Chap34"
                className="mt-4 flex h-8 w-8 items-center justify-center rounded-full bg-purple-tint text-purple-deep transition hover:bg-purple hover:text-white"
              >
                <IconInstagram className="h-4 w-4" />
              </a>
            )}
          </div>

          <nav className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] font-semibold text-muted sm:text-left">
            {LEGAL_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-navy">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="mt-10 border-t border-line pt-6 text-center text-[12px] text-muted sm:text-right">
          © {new Date().getFullYear()} Chap34 — تمامی حقوق محفوظ است.
        </p>
      </div>
    </footer>
  );
}

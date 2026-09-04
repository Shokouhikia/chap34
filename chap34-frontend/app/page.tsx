import type { Metadata } from "next";
import Link from "next/link";
import HeroVisual from "@/components/HeroVisual";
import { LANDING_IMAGES } from "@/lib/assets";
import { getSeoSettings, getSiteBaseUrl } from "@/lib/seo";
import {
  IconAward,
  IconCheck,
  IconDownload,
  IconInstagram,
  IconPlay,
  IconPrinter,
  IconShield,
  IconSparkles,
  IconTruck,
  IconUpload,
} from "@/components/icons";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  const baseUrl = getSiteBaseUrl(seo);
  return {
    alternates: { canonical: baseUrl },
  };
}

const STEPS = [
  {
    n: "۰۱",
    title: "عکس بگیر یا آپلود کن",
    text: "عکس رو از گالری انتخاب کن یا با دوربین بگیر.",
    icon: IconUpload,
  },
  {
    n: "۰۲",
    title: "هوش مصنوعی عکس را آماده می‌کند",
    text: "پس‌زمینه، کادر و نور به‌صورت خودکار بهینه‌سازی می‌شود.",
    icon: IconSparkles,
  },
  {
    n: "۰۳",
    title: "عکس را بررسی و تأیید کن",
    text: "نتیجه رو ببین و در صورت نیاز ویرایش جزئی انجام بده.",
    icon: IconCheck,
  },
  {
    n: "۰۴",
    title: "دانلود کن یا سفارش چاپ بده",
    text: "عکس نهایی رو دانلود کن یا با کیفیت چاپ سفارش بده.",
    icon: IconDownload,
  },
];

const TRUST_BAR = [
  {
    title: "اطلاعات شما امن است",
    text: "حریم خصوصی و تصاویر شما نزد ما محفوظ می‌ماند.",
    icon: IconShield,
  },
  {
    title: "تحویل سریع",
    text: "ارسال به سراسر کشور در کوتاه‌ترین زمان ممکن.",
    icon: IconTruck,
  },
  {
    title: "ضمانت رضایت",
    text: "در صورت نارضایتی، امکان ویرایش یا چاپ مجدد.",
    icon: IconCheck,
  },
  {
    title: "کیفیت چاپ عالی",
    text: "چاپ روی کاغذ عکس درجه‌یک با کیفیت بالا.",
    icon: IconAward,
  },
];

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-6">
      <section className="grid gap-10 py-8 sm:py-12 md:grid-cols-2 md:items-center md:gap-14 md:py-16">
        <div className="animate-fade-up">
          <span className="eyebrow mb-5">✨ ساخت عکس پرسنلی با هوش مصنوعی</span>
          <h1 className="mb-4 text-[28px] leading-[1.35] font-extrabold text-navy sm:text-4xl sm:leading-snug md:text-[42px]">
            سلفی بده، عکس پرسنلی{" "}
            <span className="text-purple-deep">۳×۴</span> تحویل بگیر
          </h1>
          <p className="mb-7 max-w-md text-[15px] leading-relaxed text-muted sm:text-base">
            بدون رفتن به آتلیه، عکس از خود بفرست؛ هوش مصنوعی اون رو به عکس
            پرسنلی استاندارد ۳×۴ تبدیل می‌کنه.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/capture" className="btn-primary">
              ساخت عکس ۳×۴ ↞
            </Link>
            <a href="#how-it-works" className="btn-outline">
              <IconPlay className="h-4 w-4" />
              چطور کار می‌کند؟
            </a>
          </div>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "0.12s" }}>
          <HeroVisual />
        </div>
      </section>

      <section id="how-it-works" className="border-t border-line py-12 sm:py-16">
        <h2 className="mb-2 text-center text-2xl font-extrabold text-navy">
          از سلفی تا عکس پرسنلی، فقط در چند قدم
        </h2>
        <p className="mx-auto mb-10 max-w-md text-center text-muted">
          یک فرآیند ساده و سریع، از انتخاب عکس تا دریافت خروجی نهایی.
        </p>
        <div className="relative grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-4 sm:gap-6">
          <div className="pointer-events-none absolute top-6 right-[13%] left-[13%] hidden border-t-2 border-dashed border-line sm:block" />
          {STEPS.map((step) => (
            <div key={step.n} className="relative z-10 flex flex-col items-center gap-2.5 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-purple-tint bg-white text-purple-deep shadow-sm">
                <step.icon className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-extrabold text-purple">{step.n}</span>
              <h3 className="text-[14px] font-extrabold leading-snug">{step.title}</h3>
              <p className="text-[12.5px] leading-relaxed text-muted">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="my-4 overflow-hidden rounded-[26px] bg-gradient-to-l from-purple-deep to-purple text-white sm:my-6">
        <div className="grid items-center gap-8 p-7 sm:grid-cols-2 sm:p-10 md:p-12">
          <div className="text-center sm:text-right">
            <h2 className="mb-3 text-2xl font-extrabold sm:text-[28px]">
              عکس رو فقط روی گوشی نگه ندار!
            </h2>
            <p className="mx-auto mb-6 max-w-sm text-[14.5px] leading-relaxed text-white/85 sm:mx-0">
              نسخهٔ چاپ‌شدهٔ عکس پرسنلی‌ات رو هم سفارش بده و درب منزل تحویل
              بگیر.
            </p>
            <Link
              href="/capture"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-purple-deep shadow-lg transition hover:-translate-y-0.5"
            >
              <IconPrinter className="h-4 w-4" />
              سفارش چاپ عکس
            </Link>
          </div>

          <div className="justify-self-center">
            <div className="w-[220px] sm:w-[260px] overflow-hidden rounded-2xl shadow-2xl">
              <img
                src={LANDING_IMAGES.printSample}
                alt="نمونهٔ عکس‌های پرسنلی چاپ‌شده در پاکت Chap34"
                className="block w-full h-auto"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line py-10 sm:py-12">
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {TRUST_BAR.map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-tint text-purple-deep">
                <item.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-[13.5px] font-extrabold text-navy">{item.title}</h3>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-6 border-t border-line py-12">
        <div>
          <span className="text-lg font-extrabold text-navy">Chap34</span>
          <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-muted">
            سرویس ساخت عکس پرسنلی استاندارد ۳×۴ با هوش مصنوعی و امکان سفارش
            چاپ.
          </p>
          <a
            href="https://instagram.com/chap34"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="اینستاگرام Chap34"
            className="mt-4 flex h-8 w-8 items-center justify-center rounded-full bg-purple-tint text-purple-deep transition hover:bg-purple hover:text-white"
          >
            <IconInstagram className="h-4 w-4" />
          </a>
        </div>

        <p className="mt-10 border-t border-line pt-6 text-center text-[12px] text-muted sm:text-right">
          © {new Date().getFullYear()} Chap34 — تمامی حقوق محفوظ است.
        </p>
      </footer>
    </div>
  );
}

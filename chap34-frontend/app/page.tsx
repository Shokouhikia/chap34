import Link from "next/link";

export default function HomePage() {
  return (
    <div className="text-center">
      <span className="mb-4 inline-block rounded-full bg-purple-tint px-4 py-1.5 text-xs font-bold text-purple-deep">
        عکس پرسنلی با هوش مصنوعی
      </span>
      <h1 className="mb-4 text-4xl font-extrabold leading-tight text-navy">
        عکس پرسنلی حرفه‌ای، <span className="text-purple-deep">سه‌درچهار</span>
      </h1>
      <p className="mx-auto mb-8 max-w-md text-muted">
        یک عکس بگیر یا آپلود کن؛ هوش مصنوعی عکس پرسنلی استانداردت را در چند
        ثانیه آماده می‌کند.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/capture?mode=camera" className="btn-primary">
          📷 گرفتن عکس
        </Link>
        <Link href="/capture?mode=gallery" className="btn-outline">
          🖼️ آپلود عکس
        </Link>
      </div>
      <p className="mt-6 text-xs text-muted">
        بدون نیاز به ثبت‌نام — شماره موبایل فقط برای سفارش چاپ پرسیده می‌شود.
      </p>
    </div>
  );
}

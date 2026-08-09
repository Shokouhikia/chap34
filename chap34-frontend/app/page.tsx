import Link from "next/link";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";

const TIPS = [
  {
    n: "۱",
    title: "فاصلهٔ مناسب از دوربین",
    text: "دوربین جلو رو ۴۰ تا ۵۰ سانتی‌متر از صورتت فاصله بده. اگه از دوربین پشت گوشی استفاده می‌کنی، این فاصله رو به ۱ تا ۲ متر برسون.",
  },
  {
    n: "۲",
    title: "سر و بدن رو صاف نگه دار",
    text: "مستقیم به دوربین نگاه کن و از حالت پرتره یا اریب پرهیز کن. برای عکس پرسنلی، زاویه‌دار گرفتن عکس قابل قبول نیست.",
  },
  {
    n: "۳",
    title: "نور یکنواخت داشته باش",
    text: "کنار یک پنجره در روز نوردار عکس بگیر. سایه روی صورت یا پس‌زمینه باعث می‌شه پردازش کیفیت پایین‌تری داشته باشه.",
  },
];

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-6">
      <section className="grid md:grid-cols-2 gap-12 items-center py-14">
        <div>
          <span className="eyebrow mb-4">✨ عکس پرسنلی با هوش مصنوعی</span>
          <h1 className="text-4xl font-extrabold leading-snug mb-4">
            سلفی بده، عکس پرسنلی <span className="text-purple-deep">استاندارد ۳×۴</span> تحویل بگیر
          </h1>
          <p className="text-muted text-base max-w-md mb-6">
            هوش مصنوعی فقط لباس و پس‌زمینه رو عوض می‌کنه؛ چهرهٔ تو دقیقاً همون چهرهٔ خودته —
            مناسب مدارک اداری، دفترچه، کارت دانشجویی و بیمه.
          </p>
          <ul className="flex flex-col gap-2.5 text-[14.5px] mb-8">
            <li className="flex items-center gap-2.5"><span className="w-2 h-2 rounded-full bg-purple inline-block" /> حفظ ۱۰۰٪ چهره، بدون تغییر هویت</li>
            <li className="flex items-center gap-2.5"><span className="w-2 h-2 rounded-full bg-purple-deep inline-block" /> پوشش استاندارد: کت‌وشلوار برای آقایان، مانتو و مقنعه برای خانم‌ها</li>
            <li className="flex items-center gap-2.5"><span className="w-2 h-2 rounded-full bg-purple-tint inline-block" /> خروجی ۳۰۰dpi آماده چاپ + سفارش چاپ و ارسال</li>
          </ul>
          <Link href="/capture" className="btn-primary">شروع کن ↞</Link>
        </div>

        <div className="justify-self-center flex flex-col items-center gap-3">
          <BeforeAfterSlider beforeSrc="/img/demo-before.svg" afterSrc="/img/demo-after.svg" />
          <p className="text-xs text-muted text-center">بکش تا قبل و بعد رو ببینی</p>
        </div>
      </section>

      <section className="border-t border-line py-12">
        <h2 className="text-2xl font-extrabold text-center mb-2">چطور یک سلفی خوب بگیریم؟</h2>
        <p className="text-muted text-center mb-10 max-w-md mx-auto">این چند نکته رو رعایت کن تا پردازش هوش مصنوعی بهترین نتیجه رو بده.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {TIPS.map((tip) => (
            <div key={tip.n} className="card">
              <span className="w-9 h-9 rounded-full bg-navy text-white flex items-center justify-center font-mono2 font-bold text-sm mb-4">{tip.n}</span>
              <h3 className="font-extrabold text-[15.5px] mb-2">{tip.title}</h3>
              <p className="text-muted text-[13.5px]">{tip.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-6 border-t border-line py-10 mb-6 text-center">
        <div>
          <strong className="block text-[15px] font-extrabold mb-1">حفظ چهره</strong>
          <span className="text-muted text-[13.5px]">بدون تغییر هویت بصری</span>
        </div>
        <div>
          <strong className="block text-[15px] font-extrabold mb-1">خروجی چاپی</strong>
          <span className="text-muted text-[13.5px]">۳۰۰dpi و اندازه استاندارد</span>
        </div>
        <div>
          <strong className="block text-[15px] font-extrabold mb-1">پرداخت امن</strong>
          <span className="text-muted text-[13.5px]">درگاه بانکی معتبر</span>
        </div>
      </section>
    </div>
  );
}

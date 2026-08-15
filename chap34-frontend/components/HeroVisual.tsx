import {
  IconBackground,
  IconFrame,
  IconIdCard,
  IconPrinter,
  IconSparkles,
} from "@/components/icons";
import { LANDING_IMAGES } from "@/lib/assets";

const FEATURES = [
  { text: "حذف و اصلاح پس‌زمینه", icon: IconBackground },
  { text: "استانداردسازی کادر و اندازه", icon: IconFrame },
  { text: "مناسب مدارک و ثبت‌نام", icon: IconIdCard },
  { text: "امکان سفارش چاپ", icon: IconPrinter },
];

export default function HeroVisual() {
  return (
    <div className="w-full max-w-[380px] sm:max-w-[420px] mx-auto md:mx-0">
      <div className="rounded-[26px] border border-line bg-white p-4 sm:p-5 shadow-[0_30px_60px_-30px_rgba(18,20,58,0.28)]">
        <div className="flex items-start gap-2.5 sm:gap-3">
          <div className="min-w-0 flex-1">
            <span className="badge-soft block text-center">عکس شما</span>
            <div className="mt-2 aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-purple-tint/40">
              <img
                src={LANDING_IMAGES.heroSelfie}
                alt="سلفی معمولی شما"
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1.5 pt-8 sm:pt-9">
            <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple to-purple-deep text-white shadow-md shadow-purple/30">
              <IconSparkles className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <span className="hidden sm:block text-[10px] font-bold text-muted">AI</span>
          </div>

          <div className="min-w-0 flex-1">
            <span className="badge-soft block text-center">استاندارد ۳×۴</span>
            <div className="relative mt-2 aspect-[3/4] overflow-hidden rounded-2xl border-2 border-purple/50 bg-white">
              <img
                src={LANDING_IMAGES.heroResult}
                alt="عکس پرسنلی استاندارد ۳×۴"
                className="h-full w-full object-cover"
                draggable={false}
              />
              <span className="absolute bottom-1.5 left-1.5 rounded-md bg-ink/75 px-1.5 py-0.5 text-[9px] font-bold text-white">
                ۳×۴ cm
              </span>
            </div>
          </div>
        </div>

        <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-line pt-4 sm:mt-5 sm:pt-4">
          {FEATURES.map((item) => (
            <li
              key={item.text}
              className="flex items-center gap-1.5 text-[11.5px] font-semibold text-navy/80 sm:text-[12px]"
            >
              <item.icon className="h-3.5 w-3.5 shrink-0 text-purple" />
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

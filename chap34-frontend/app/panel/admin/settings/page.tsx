"use client";

import { useEffect, useState } from "react";
import { panelApi } from "@/lib/panelApi";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [modelChoices, setModelChoices] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [providerChoice, setProviderChoice] = useState("avalai");

  function load() {
    panelApi
      .getAdminSettings()
      .then((d) => {
        setSettings(d.settings);
        setModelChoices(d.avalai_model_choices || {});
        setProviderChoice(d.settings.ai_provider || "avalai");
      })
      .catch(() => {});
  }
  useEffect(load, []);

  async function save() {
    await panelApi.updateAdminSettings(form);
    setForm({});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  }

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  if (!settings) return <p className="text-muted">در حال بارگذاری...</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="card">
        <h2 className="text-lg font-extrabold mb-1">💰 قیمت‌گذاری چاپ</h2>
        <p className="text-xs text-muted mb-4">هر تعداد را جدا قیمت‌گذاری کنید — همون لحظه توی سایت اعمال می‌شه.</p>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="field-label">۶ قطعه (تومان)</label><input defaultValue={settings.price_base_qty_6} onChange={(e) => update("price_base_qty_6", e.target.value)} className="field-input" /></div>
          <div><label className="field-label">۱۲ قطعه (تومان)</label><input defaultValue={settings.price_base_qty_12} onChange={(e) => update("price_base_qty_12", e.target.value)} className="field-input" /></div>
          <div><label className="field-label">۲۴ قطعه (تومان)</label><input defaultValue={settings.price_base_qty_24} onChange={(e) => update("price_base_qty_24", e.target.value)} className="field-input" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div><label className="field-label">ضریب سایز ۳×۴</label><input defaultValue={settings.size_multiplier_3x4} onChange={(e) => update("size_multiplier_3x4", e.target.value)} className="field-input" /></div>
          <div><label className="field-label">ضریب سایز ۶×۸</label><input defaultValue={settings.size_multiplier_6x8} onChange={(e) => update("size_multiplier_6x8", e.target.value)} className="field-input" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div><label className="field-label">ضریب کاغذ براق</label><input defaultValue={settings.paper_multiplier_glossy} onChange={(e) => update("paper_multiplier_glossy", e.target.value)} className="field-input" /></div>
          <div><label className="field-label">ضریب کاغذ مات</label><input defaultValue={settings.paper_multiplier_matte} onChange={(e) => update("paper_multiplier_matte", e.target.value)} className="field-input" /></div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-extrabold mb-1">📦 هزینهٔ ارسال پستی</h2>
        <p className="text-xs text-muted mb-4">هزینه ثابت ارسال برای همهٔ استان‌ها.</p>
        <div className="grid grid-cols-1 gap-3">
          <div><label className="field-label">هزینه ارسال (تومان)</label><input defaultValue={settings.shipping_cost} onChange={(e) => update("shipping_cost", e.target.value)} className="field-input" /></div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-extrabold mb-1">🔍 سئو (SEO) سراسری سایت</h2>
        <p className="text-xs text-muted mb-4">
          این مقادیر پیش‌فرض/fallback کل سایت هستند. فقط وقتی استفاده می‌شوند که متادیتای اختصاصی صفحه موجود نباشد.
        </p>

        <label className="field-label mt-2">Base URL (دامنه‌ی اصلی سایت)</label>
        <input
          defaultValue={settings.base_url}
          onChange={(e) => update("base_url", e.target.value)}
          className="field-input mb-1"
          placeholder="https://chap34.ir"
          dir="ltr"
        />
        <p className="text-xs text-muted mb-3">
          برای sitemap، canonical و OG image استفاده می‌شود. بدون اسلش انتهایی وارد کنید.
        </p>

        <label className="field-label mt-2">عنوان پیش‌فرض سایت (Default Site Title)</label>
        <input
          defaultValue={settings.seo_site_title}
          onChange={(e) => update("seo_site_title", e.target.value)}
          className="field-input mb-1"
          placeholder="مثلاً: Chap34 — عکس پرسنلی با هوش مصنوعی"
        />
        <SeoLengthHint value={form.seo_site_title ?? settings.seo_site_title} max={60} label="عنوان" />

        <label className="field-label mt-3">توضیحات پیش‌فرض سایت (Default Site Description)</label>
        <textarea
          defaultValue={settings.seo_site_description}
          onChange={(e) => update("seo_site_description", e.target.value)}
          className="field-input mb-1"
          rows={3}
          placeholder="یک یا دو جمله دربارهٔ سایت"
        />
        <SeoLengthHint value={form.seo_site_description ?? settings.seo_site_description} max={160} label="توضیحات" />

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="field-label">تصویر OG پیش‌فرض (مسیر یا URL)</label>
            <input
              defaultValue={settings.seo_default_og_image}
              onChange={(e) => update("seo_default_og_image", e.target.value)}
              className="field-input"
              placeholder="/img/logo-wordmark.jpg"
              dir="ltr"
            />
          </div>
          <div>
            <label className="field-label">لوگوی سایت (مسیر یا URL)</label>
            <input
              defaultValue={settings.seo_site_logo}
              onChange={(e) => update("seo_site_logo", e.target.value)}
              className="field-input"
              placeholder="/img/logo-wordmark.jpg"
              dir="ltr"
            />
          </div>
        </div>

        <label className="field-label mt-3">کد تأیید Google Search Console</label>
        <input
          defaultValue={settings.seo_gsc_verification}
          onChange={(e) => update("seo_gsc_verification", e.target.value)}
          className="field-input"
          placeholder="مقدار content متاتگ google-site-verification"
          dir="ltr"
        />

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="field-label">Google Analytics Measurement ID</label>
            <input
              defaultValue={settings.seo_ga_measurement_id}
              onChange={(e) => update("seo_ga_measurement_id", e.target.value)}
              className="field-input"
              placeholder="G-XXXXXXX"
              dir="ltr"
            />
          </div>
          <div>
            <label className="field-label">Google Tag Manager Container ID</label>
            <input
              defaultValue={settings.seo_gtm_container_id}
              onChange={(e) => update("seo_gtm_container_id", e.target.value)}
              className="field-input"
              placeholder="GTM-XXXXXXX"
              dir="ltr"
            />
          </div>
        </div>
        <p className="text-xs text-muted mt-1">
          این دو شناسه به‌صورت رسمی public هستند و در HTML سایت درج می‌شوند؛ کلید/credential حساسی نیستند.
        </p>

        <SeoPreview
          title={form.seo_site_title ?? settings.seo_site_title}
          description={form.seo_site_description ?? settings.seo_site_description}
          ogImage={form.seo_default_og_image ?? settings.seo_default_og_image}
          baseUrl={form.base_url ?? settings.base_url}
        />

        <button onClick={save} className="btn-primary w-full mt-4">ذخیرهٔ این بخش</button>
      </div>

      <div className="card">
        <h2 className="text-lg font-extrabold mb-1">🔌 اتصال سرویس‌های بیرونی</h2>
        <fieldset className="border border-line rounded-md2 p-4 mb-3 mt-3">
          <legend className="text-[13.5px] font-extrabold px-2">پیامک OTP</legend>
          <label className="field-label mt-2">API Key (Kavenegar)</label>
          <input onChange={(e) => update("sms_api_key", e.target.value)} className="field-input mb-1" placeholder="کلید API" />
          <p className="text-xs text-muted">{settings._has_sms_api_key ? `فعلی: ${settings.sms_api_key}` : "هنوز تنظیم نشده"}</p>
        </fieldset>
        <fieldset className="border border-line rounded-md2 p-4 mb-3">
          <legend className="text-[13.5px] font-extrabold px-2">هوش مصنوعی (ساخت عکس پرسنلی)</legend>

          <label className="field-label mt-2">سرویس‌دهنده</label>
          <select
            defaultValue={settings.ai_provider || "avalai"}
            onChange={(e) => {
              update("ai_provider", e.target.value);
              setProviderChoice(e.target.value);
            }}
            className="field-input mb-3"
          >
            <option value="avalai">AvalAI</option>
            <option value="openai">OpenAI</option>
          </select>

          {providerChoice === "avalai" && (
            <>
              <label className="field-label">مدل AvalAI</label>
              <select
                defaultValue={settings.avalai_model || Object.keys(modelChoices)[0]}
                onChange={(e) => update("avalai_model", e.target.value)}
                className="field-input mb-3"
              >
                {Object.entries(modelChoices).map(([slug, label]) => (
                  <option key={slug} value={slug}>
                    {label}
                  </option>
                ))}
              </select>

              <label className="field-label">AvalAI API Key</label>
              <input onChange={(e) => update("avalai_api_key", e.target.value)} className="field-input mb-1" placeholder="aa-..." dir="ltr" />
              <p className="text-xs text-muted mb-3">{settings._has_avalai_api_key ? `فعلی: ${settings.avalai_api_key}` : "هنوز تنظیم نشده"}</p>
            </>
          )}

          <label className="field-label">Google AI Studio API Key (برای حالت OpenAI استفاده نمی‌شود)</label>
          <input onChange={(e) => update("google_ai_api_key", e.target.value)} className="field-input mb-1" placeholder="کلید API" />
          <p className="text-xs text-muted">{settings._has_google_ai_api_key ? `فعلی: ${settings.google_ai_api_key}` : "هنوز تنظیم نشده"}</p>
        </fieldset>
        <fieldset className="border border-line rounded-md2 p-4">
          <legend className="text-[13.5px] font-extrabold px-2">درگاه پرداخت</legend>
          <label className="field-label mt-2">مرچنت آی‌دی زرین‌پال</label>
          <input onChange={(e) => update("zarinpal_merchant_id", e.target.value)} className="field-input mb-1" placeholder="Merchant ID" />
          <p className="text-xs text-muted">{settings._has_zarinpal_merchant_id ? `فعلی: ${settings.zarinpal_merchant_id}` : "هنوز تنظیم نشده"}</p>
        </fieldset>
        <button onClick={save} className="btn-primary w-full mt-4">ذخیرهٔ این بخش</button>
        {saved && <p className="text-green-600 font-bold text-[13px] mt-2">✓ ذخیره شد</p>}
      </div>
    </div>
  );
}

function SeoLengthHint({ value, max, label }: { value: string; max: number; label: string }) {
  const len = (value || "").length;
  if (len === 0) return <p className="text-xs text-muted mb-2">در صورت خالی بودن، از fallback مناسب استفاده می‌شود.</p>;
  const over = len > max;
  return (
    <p className={`text-xs mb-2 ${over ? "text-amber-600 font-bold" : "text-muted"}`}>
      {len} / {max} کاراکتر{over ? ` — طول ${label} بیشتر از حد توصیه‌شده است و ممکن است در نتایج گوگل کوتاه شود.` : ""}
    </p>
  );
}

function SeoPreview({
  title,
  description,
  ogImage,
  baseUrl,
}: {
  title: string;
  description: string;
  ogImage: string;
  baseUrl: string;
}) {
  const displayTitle = title || "عنوان صفحه اینجا نمایش داده می‌شود";
  const displayDesc = description || "توضیحات صفحه اینجا نمایش داده می‌شود";
  const displayDomain = (baseUrl || "").replace(/^https?:\/\//, "").replace(/\/+$/, "") || "your-domain.com";
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
      <div className="border border-line rounded-md2 p-3">
        <p className="text-[11px] font-bold text-muted mb-2">پیش‌نمایش گوگل</p>
        <div dir="ltr" className="text-left">
          <p className="text-[13px] text-[#1a0dab] truncate">{displayTitle}</p>
          <p className="text-[12px] text-[#006621]">{displayDomain}</p>
          <p className="text-[12.5px] text-[#545454] line-clamp-2">{displayDesc}</p>
        </div>
      </div>
      <div className="border border-line rounded-md2 p-3">
        <p className="text-[11px] font-bold text-muted mb-2">پیش‌نمایش شبکه‌های اجتماعی</p>
        {ogImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ogImage} alt="" className="w-full h-24 object-cover rounded-md2 bg-[#f2f2f2] mb-2" />
        ) : (
          <div className="w-full h-24 rounded-md2 bg-[#f2f2f2] mb-2 flex items-center justify-center text-xs text-muted">
            بدون تصویر
          </div>
        )}
        <p className="text-[13px] font-bold truncate">{displayTitle}</p>
        <p className="text-[12px] text-muted line-clamp-2">{displayDesc}</p>
      </div>
    </div>
  );
}

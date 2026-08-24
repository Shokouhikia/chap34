"use client";

import { useEffect, useState } from "react";
import { panelApi } from "@/lib/panelApi";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [modelChoices, setModelChoices] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [providerChoice, setProviderChoice] = useState("openrouter");

  function load() {
    panelApi
      .getAdminSettings()
      .then((d) => {
        setSettings(d.settings);
        setModelChoices(d.openrouter_model_choices || {});
        setProviderChoice(d.settings.ai_provider || "openrouter");
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
            defaultValue={settings.ai_provider || "openrouter"}
            onChange={(e) => {
              update("ai_provider", e.target.value);
              setProviderChoice(e.target.value);
            }}
            className="field-input mb-3"
          >
            <option value="openrouter">OpenRouter</option>
            <option value="openai">OpenAI</option>
            <option value="avalai">AvalAI</option>
          </select>

          <label className="field-label">مدل OpenRouter</label>
          <select
            defaultValue={settings.openrouter_model || Object.keys(modelChoices)[0]}
            onChange={(e) => update("openrouter_model", e.target.value)}
            className="field-input mb-1"
          >
            {Object.entries(modelChoices).map(([slug, label]) => (
              <option key={slug} value={slug}>
                {label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted mb-3">
            وقتی سرویس‌دهنده OpenRouter باشد استفاده می‌شود. Seedance عمدتاً مدل ویدیوست؛ اگر ادیت عکس رو پشتیبانی نکرد، گزینهٔ نانو بنانا را انتخاب کنید.
          </p>

          <label className="field-label">OpenRouter API Key</label>
          <input onChange={(e) => update("openrouter_api_key", e.target.value)} className="field-input mb-1" placeholder="sk-or-v1-..." dir="ltr" />
          <p className="text-xs text-muted mb-3">{settings._has_openrouter_api_key ? `فعلی: ${settings.openrouter_api_key}` : "هنوز تنظیم نشده"}</p>

          {providerChoice === "avalai" && (
            <>
              <label className="field-label">مدل AvalAI</label>
              <input
                defaultValue={settings.avalai_model}
                onChange={(e) => update("avalai_model", e.target.value)}
                className="field-input mb-3"
                placeholder="gemini-3.1-flash-lite-image"
                dir="ltr"
              />

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

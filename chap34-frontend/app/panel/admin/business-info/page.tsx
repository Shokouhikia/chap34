"use client";

import { useEffect, useState } from "react";
import { panelApi } from "@/lib/panelApi";

const TABS = [
  { key: "contact", label: "تماس و آدرس" },
  { key: "smsir", label: "سرویس پیامکی (SMS.ir)" },
  { key: "notifications", label: "پیامک قدیمی و ایمیل" },
  { key: "payment", label: "درگاه پرداخت" },
  { key: "legal", label: "محتوای صفحات قانونی" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function BusinessInfoPage() {
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<TabKey>("contact");
  const [saved, setSaved] = useState(false);

  function load() {
    panelApi
      .getAdminSettings()
      .then((d) => setSettings(d.settings))
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
        <h2 className="text-lg font-extrabold mb-1">🏢 اطلاعات کسب‌وکار</h2>
        <p className="text-xs text-muted mb-4">
          این اطلاعات در فوتر سایت، صفحه‌ی تماس با ما، و صفحات قانونی نمایش داده می‌شود.
        </p>

        <div className="flex gap-1 mb-5 border-b border-line overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap px-3 py-2 text-[13px] font-bold border-b-2 -mb-px transition ${
                tab === t.key ? "border-purple text-purple-deep" : "border-transparent text-muted hover:text-navy"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "contact" && (
          <div>
            <label className="field-label">شماره تلفن</label>
            <input
              defaultValue={settings.biz_phone}
              onChange={(e) => update("biz_phone", e.target.value)}
              className="field-input mb-3"
              placeholder="021-xxxxxxxx"
              dir="ltr"
            />
            <label className="field-label">ایمیل</label>
            <input
              defaultValue={settings.biz_email}
              onChange={(e) => update("biz_email", e.target.value)}
              className="field-input mb-3"
              placeholder="support@chap34.ir"
              dir="ltr"
            />
            <label className="field-label">آدرس دقیق کسب‌وکار</label>
            <textarea
              defaultValue={settings.biz_address}
              onChange={(e) => update("biz_address", e.target.value)}
              className="field-input mb-3"
              rows={2}
            />
            <label className="field-label">لینک اینستاگرام (اختیاری)</label>
            <input
              defaultValue={settings.biz_instagram}
              onChange={(e) => update("biz_instagram", e.target.value)}
              className="field-input"
              placeholder="https://instagram.com/chap34"
              dir="ltr"
            />
          </div>
        )}

        {tab === "smsir" && <SmsirTab settings={settings} update={update} />}

        {tab === "notifications" && (
          <div>
            <fieldset className="border border-line rounded-md2 p-4 mb-4">
              <legend className="text-[13.5px] font-extrabold px-2">پیامک Kavenegar (fallback)</legend>
              <p className="text-xs text-muted mb-3">
                این سرویس فقط وقتی استفاده می‌شود که «سرویس پیامکی (SMS.ir)» غیرفعال باشد — یک fallback است، نه سرویس اصلی.
              </p>
              <label className="field-label">API Key (Kavenegar)</label>
              <input onChange={(e) => update("sms_api_key", e.target.value)} className="field-input" placeholder="کلید API" dir="ltr" />
              <p className="text-xs text-muted mt-1">{settings._has_sms_api_key ? `فعلی: ${settings.sms_api_key}` : "هنوز تنظیم نشده"}</p>
            </fieldset>

            <fieldset className="border border-line rounded-md2 p-4">
              <legend className="text-[13.5px] font-extrabold px-2">ایمیل (SMTP)</legend>
              <p className="text-xs text-muted mb-3">برای اطلاع‌رسانی پیام‌های فرم تماس به ایمیل کسب‌وکار استفاده می‌شود.</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="field-label">SMTP Host</label>
                  <input defaultValue={settings.smtp_host} onChange={(e) => update("smtp_host", e.target.value)} className="field-input" placeholder="smtp.example.com" dir="ltr" />
                </div>
                <div>
                  <label className="field-label">SMTP Port</label>
                  <input defaultValue={settings.smtp_port} onChange={(e) => update("smtp_port", e.target.value)} className="field-input" placeholder="587" dir="ltr" />
                </div>
              </div>
              <label className="field-label">SMTP Username</label>
              <input defaultValue={settings.smtp_username} onChange={(e) => update("smtp_username", e.target.value)} className="field-input mb-3" dir="ltr" />
              <label className="field-label">SMTP Password</label>
              <input onChange={(e) => update("smtp_password", e.target.value)} className="field-input mb-1" dir="ltr" />
              <p className="text-xs text-muted mb-3">{settings._has_smtp_password ? "رمز تنظیم شده است" : "هنوز تنظیم نشده"}</p>
              <label className="field-label">From Email</label>
              <input defaultValue={settings.smtp_from_email} onChange={(e) => update("smtp_from_email", e.target.value)} className="field-input" placeholder="no-reply@chap34.ir" dir="ltr" />
            </fieldset>
          </div>
        )}

        {tab === "payment" && (
          <div>
            <label className="field-label">درگاه فعال</label>
            <select
              defaultValue={settings.payment_gateway || "zarinpal"}
              onChange={(e) => update("payment_gateway", e.target.value)}
              className="field-input mb-3"
            >
              <option value="zarinpal">زرین‌پال (پیاده‌سازی‌شده)</option>
            </select>
            <label className="field-label">Merchant ID زرین‌پال</label>
            <input onChange={(e) => update("zarinpal_merchant_id", e.target.value)} className="field-input mb-1" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" dir="ltr" />
            <p className="text-xs text-muted">{settings._has_zarinpal_merchant_id ? `فعلی: ${settings.zarinpal_merchant_id}` : "هنوز تنظیم نشده — بدون این مقدار پرداخت غیرفعال می‌ماند"}</p>
          </div>
        )}

        {tab === "legal" && (
          <div>
            <label className="field-label">متن درباره ما</label>
            <textarea defaultValue={settings.legal_about} onChange={(e) => update("legal_about", e.target.value)} className="field-input mb-4" rows={6} />

            <label className="field-label">متن قوانین و مقررات</label>
            <textarea defaultValue={settings.legal_terms} onChange={(e) => update("legal_terms", e.target.value)} className="field-input mb-4" rows={6} />

            <label className="field-label">متن حریم خصوصی</label>
            <textarea defaultValue={settings.legal_privacy} onChange={(e) => update("legal_privacy", e.target.value)} className="field-input mb-4" rows={6} />

            <label className="field-label">متن شرایط استفاده از تصاویر کاربران</label>
            <textarea defaultValue={settings.legal_user_content_terms} onChange={(e) => update("legal_user_content_terms", e.target.value)} className="field-input mb-4" rows={6} />

            <label className="field-label">متن قوانین لغو سفارش و بازگشت وجه</label>
            <textarea defaultValue={settings.legal_refund_policy} onChange={(e) => update("legal_refund_policy", e.target.value)} className="field-input" rows={6} />

            <p className="text-xs text-amber-600 font-bold mt-2">
              ⚠️ این متن‌ها پیش‌نویس اولیه‌اند و باید پیش از انتشار نهایی توسط شما یا مشاور حقوقی بازبینی شوند.
            </p>
          </div>
        )}

        <button onClick={save} className="btn-primary w-full mt-5">ذخیره</button>
        {saved && <p className="text-green-600 font-bold text-[13px] mt-2">✓ ذخیره شد</p>}
      </div>
    </div>
  );
}

function SmsirTab({
  settings,
  update,
}: {
  settings: any;
  update: (key: string, value: string) => void;
}) {
  const [enabled, setEnabled] = useState(settings.smsir_enabled === "true");
  const [credit, setCredit] = useState<number | null | "loading" | "error">(null);

  async function checkCredit() {
    setCredit("loading");
    try {
      const res = await panelApi.getSmsirCredit();
      setCredit(res.enabled ? res.credit : null);
    } catch {
      setCredit("error");
    }
  }

  function toggle(key: string, checked: boolean) {
    update(key, checked ? "true" : "false");
  }

  return (
    <div>
      <label className="flex items-center gap-2 text-[13px] font-bold mb-4">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            toggle("smsir_enabled", e.target.checked);
          }}
        />
        فعال‌سازی SMS.ir به‌عنوان سرویس پیامکی اصلی
      </label>

      <label className="field-label">API Key</label>
      <input onChange={(e) => update("smsir_api_key", e.target.value)} className="field-input mb-1" placeholder="کلید API" dir="ltr" />
      <p className="text-xs text-muted mb-3">{settings._has_smsir_api_key ? `فعلی: ${settings.smsir_api_key}` : "هنوز تنظیم نشده"}</p>

      <label className="field-label">شماره خط ارسال (Line Number)</label>
      <input
        defaultValue={settings.smsir_line_number}
        onChange={(e) => update("smsir_line_number", e.target.value)}
        className="field-input mb-3"
        placeholder="مثلاً 30007xxxxxx"
        dir="ltr"
      />

      <label className="field-label">Template ID پیامک تأیید (OTP / Verify)</label>
      <input
        defaultValue={settings.smsir_otp_template_id}
        onChange={(e) => update("smsir_otp_template_id", e.target.value)}
        className="field-input mb-1"
        placeholder="شناسه‌ی قالب تأییدشده در پنل SMS.ir"
        dir="ltr"
      />
      <p className="text-xs text-muted mb-4">
        اگر خالی بماند، کد ورود به‌صورت پیامک متنی ساده ارسال می‌شود (بدون قالب Verify).
      </p>

      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={checkCredit} className="btn-outline">
          بررسی اعتبار حساب
        </button>
        {credit === "loading" && <span className="text-xs text-muted">در حال بررسی...</span>}
        {credit === "error" && <span className="text-xs text-red-500 font-bold">خطا در دریافت اعتبار</span>}
        {typeof credit === "number" && <span className="text-xs font-bold text-navy">اعتبار: {credit.toLocaleString("fa-IR")}</span>}
      </div>

      <fieldset className="border border-line rounded-md2 p-4">
        <legend className="text-[13.5px] font-extrabold px-2">انواع پیامک فعال</legend>
        <label className="flex items-center gap-2 text-[13px] font-bold mb-2">
          <input
            type="checkbox"
            defaultChecked={settings.smsir_notify_order_placed !== "false"}
            onChange={(e) => toggle("smsir_notify_order_placed", e.target.checked)}
          />
          پیامک ثبت سفارش
          <span className="font-normal text-muted">(هنوز به رویداد جداگانه‌ای وصل نشده)</span>
        </label>
        <label className="flex items-center gap-2 text-[13px] font-bold mb-2">
          <input
            type="checkbox"
            defaultChecked={settings.smsir_notify_payment_confirmed !== "false"}
            onChange={(e) => toggle("smsir_notify_payment_confirmed", e.target.checked)}
          />
          پیامک تأیید پرداخت
        </label>
        <label className="flex items-center gap-2 text-[13px] font-bold">
          <input
            type="checkbox"
            defaultChecked={settings.smsir_notify_status_change !== "false"}
            onChange={(e) => toggle("smsir_notify_status_change", e.target.checked)}
          />
          پیامک تغییر وضعیت سفارش (ارسال/تحویل)
        </label>
      </fieldset>
    </div>
  );
}

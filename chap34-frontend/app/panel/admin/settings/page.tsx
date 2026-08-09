"use client";

import { useEffect, useState } from "react";
import { panelApi } from "@/lib/panelApi";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [newShopUser, setNewShopUser] = useState("");
  const [newShopPass, setNewShopPass] = useState("");
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newPercent, setNewPercent] = useState("10");

  function load() {
    panelApi.getAdminSettings().then((d) => setSettings(d.settings)).catch(() => {});
    panelApi.listAtelierAccounts().then(setAccounts).catch(() => {});
    panelApi.listDiscountCodes().then(setDiscounts).catch(() => {});
  }
  useEffect(load, []);

  async function save() {
    await panelApi.updateAdminSettings(form);
    setForm({});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  }

  async function createShopAccount() {
    await panelApi.createAtelierAccount(newShopUser, newShopPass);
    setNewShopUser(""); setNewShopPass("");
    load();
  }

  async function createDiscount() {
    await panelApi.createDiscountCode(newCode, Number(newPercent));
    setNewCode(""); setNewPercent("10");
    load();
  }

  async function toggleDiscount(id: string) {
    await panelApi.toggleDiscountCode(id);
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
          <legend className="text-[13.5px] font-extrabold px-2">هوش مصنوعی</legend>
          <label className="field-label mt-2">Google AI Studio API Key</label>
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

      <div className="card">
        <h2 className="text-lg font-extrabold mb-1">🎯 کدهای تخفیف</h2>
        <p className="text-xs text-muted mb-4">درصدی که وارد می‌کنید فقط از هزینهٔ چاپ کم می‌شه، نه هزینهٔ ارسال.</p>
        <table className="w-full text-[13.5px] mb-4">
          <thead><tr className="text-muted text-xs"><th className="text-right py-2">کد</th><th className="text-right py-2">درصد</th><th className="text-right py-2">وضعیت</th><th></th></tr></thead>
          <tbody>
            {discounts.map((d) => (
              <tr key={d.id} className="border-t border-line">
                <td className="py-2 font-mono2">{d.code}</td>
                <td className="py-2">{d.percent}٪</td>
                <td className="py-2">{d.active ? <span className="text-green-600">فعال</span> : <span className="text-muted">غیرفعال</span>}</td>
                <td className="py-2"><button onClick={() => toggleDiscount(d.id)} className="btn-outline text-xs px-3 py-1">{d.active ? "غیرفعال کن" : "فعال کن"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2">
          <input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="کد (مثلاً WELCOME10)" className="field-input" />
          <input value={newPercent} onChange={(e) => setNewPercent(e.target.value)} placeholder="٪" type="number" min={1} max={100} className="field-input w-24" />
          <button onClick={createDiscount} className="btn-primary whitespace-nowrap">ایجاد کد</button>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-extrabold mb-1">👷 حساب‌های پنل آتلیه</h2>
        <p className="text-xs text-muted mb-4">هر تعداد که بخواهید برای کارکنان چاپخانه بسازید.</p>
        <table className="w-full text-[13.5px] mb-4">
          <tbody>{accounts.map((a) => <tr key={a.id} className="border-t border-line"><td className="py-2">{a.username}</td><td className="py-2">{a.name}</td><td className="py-2">{a.is_active ? "فعال" : "غیرفعال"}</td></tr>)}</tbody>
        </table>
        <div className="flex gap-2">
          <input value={newShopUser} onChange={(e) => setNewShopUser(e.target.value)} placeholder="نام کاربری جدید" className="field-input" />
          <input value={newShopPass} onChange={(e) => setNewShopPass(e.target.value)} placeholder="رمز عبور" className="field-input" />
          <button onClick={createShopAccount} className="btn-primary whitespace-nowrap">ایجاد حساب</button>
        </div>
      </div>
    </div>
  );
}

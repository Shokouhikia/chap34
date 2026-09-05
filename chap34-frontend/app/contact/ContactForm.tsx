"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    setError(null);
    if (!name.trim() || !phone.trim() || !message.trim()) {
      setError("نام، شماره تماس و متن پیام الزامی است");
      return;
    }
    setSending(true);
    try {
      await api.submitContact({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        subject: subject.trim() || "بدون موضوع",
        message: message.trim(),
      });
      setSent(true);
      setName("");
      setPhone("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ارسال پیام ناموفق بود");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="card border-green-200 bg-green-50 text-center">
        <p className="font-bold text-green-700">پیام شما با موفقیت ارسال شد.</p>
        <p className="mt-1 text-sm text-green-700/80">به‌زودی با شما تماس خواهیم گرفت.</p>
        <button onClick={() => setSent(false)} className="btn-outline mt-4">
          ارسال پیام دیگر
        </button>
      </div>
    );
  }

  return (
    <div>
      <label className="field-label">نام و نام خانوادگی</label>
      <input value={name} onChange={(e) => setName(e.target.value)} className="field-input mb-3" />

      <label className="field-label">شماره تماس</label>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} className="field-input mb-3" dir="ltr" />

      <label className="field-label">ایمیل (اختیاری)</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} className="field-input mb-3" dir="ltr" />

      <label className="field-label">موضوع</label>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} className="field-input mb-3" />

      <label className="field-label">پیام</label>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className="field-input mb-3" />

      {error && <p className="mb-3 text-sm font-bold text-red-500">{error}</p>}

      <button onClick={submit} disabled={sending} className="btn-primary w-full">
        {sending ? "در حال ارسال..." : "ارسال پیام"}
      </button>
    </div>
  );
}

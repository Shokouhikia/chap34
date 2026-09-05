"use client";

import { Suspense } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { printDraft } from "@/lib/draft";

const SIZE_LABEL: Record<string, string> = { "3x4": "۳×۴", "6x8": "۶×۸" };
const PAPER_LABEL: Record<string, string> = { glossy: "چاپ براق (گلاسه)", matte: "چاپ مات" };

const toman = (n: number) => n.toLocaleString("fa-IR");

function SummaryPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draft = printDraft.get();
  // Fall back to the draft: the login redirect used to drop the query string,
  // which left photoId empty and made createOrder fail 422 validation.
  const photoId = searchParams.get("photoId") || draft?.photoId || "";

  const [orderId, setOrderId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);

  useEffect(() => {
    if (!draft || !draft.phone) {
      router.push(`/checkout/address?photoId=${photoId}`);
      return;
    }

    if (!photoId) {
      // Nothing to order against - don't fire a request that can only 422.
      setError("عکس این سفارش مشخص نیست. لطفاً دوباره از ابتدا شروع کنید.");
      setLoading(false);
      return;
    }

    api
      .createOrder({
        photo_id: photoId,
        size: draft.size,
        quantity: draft.quantity,
        paper_type: draft.paperType,
        address: {
          full_name: draft.fullName!,
          province: draft.province!,
          city: draft.city!,
          full_address: draft.fullAddress!,
          postal_code: draft.postalCode!,
          phone: draft.phone!,
        },
      })
       .then((data) => {
         setOrderId(data.order_id);
         setAmount(data.amount_due);
         setShippingCost(data.shipping_cost);
         setDiscountAmount(data.discount_amount || 0);
         setDiscountPercent(data.discount_percent || null);
         if (data.discount_code) setDiscountCode(data.discount_code);
       })
       .catch((err) => setError(err instanceof Error ? err.message : "خطای ناشناخته"))
       .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyDiscount() {
    if (!draft || !discountCode.trim()) return;
    setError(null);
    try {
      const data = await api.createOrder({
        photo_id: photoId,
        size: draft.size,
        quantity: draft.quantity,
        paper_type: draft.paperType,
        address: {
          full_name: draft.fullName!,
          province: draft.province!,
          city: draft.city!,
          full_address: draft.fullAddress!,
          postal_code: draft.postalCode!,
          phone: draft.phone!,
        },
        discount_code: discountCode.trim(),
      });
      setOrderId(data.order_id);
      setAmount(data.amount_due);
      setDiscountAmount(data.discount_amount || 0);
      setDiscountPercent(data.discount_percent || null);
      if (data.discount_code) setDiscountCode(data.discount_code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در اعمال کد تخفیف");
    }
  }

  async function pay() {
    if (!orderId) return;
    setPaying(true);
    setError(null);
    try {
      const init = await api.initPayment(orderId);
      // Real Zarinpal redirect - the customer pays on Zarinpal's own page,
      // never inside a form on this site, and Zarinpal sends them back to
      // /checkout/payment-callback afterwards.
      window.location.href = init.gateway_redirect_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "پرداخت ناموفق بود");
      setPaying(false);
    }
  }

  if (loading) {
    return <p className="text-center text-sm text-muted">در حال ثبت سفارش...</p>;
  }

  return (
    <div className="mx-auto max-w-sm">
      <h2 className="mb-6 text-center text-xl font-extrabold text-navy">
        خلاصه سفارش و پرداخت
      </h2>

      {draft && (
        <div className="price-box mb-4">
          <div className="price-row">
            <span>سایز</span>
            <span>{SIZE_LABEL[draft.size]}</span>
          </div>
          <div className="price-row">
            <span>نوع کاغذ</span>
            <span>{PAPER_LABEL[draft.paperType]}</span>
          </div>
          <div className="price-row">
            <span>تعداد</span>
            <span>{toman(draft.quantity)} قطعه</span>
          </div>
          {shippingCost !== null && (
            <div className="price-row">
              <span>هزینه ارسال</span>
              <span>{toman(shippingCost)} تومان</span>
            </div>
          )}
        </div>
      )}

      <div className="mb-4">
        <label className="mb-1 block text-sm font-bold text-navy">کد تخفیف (اختیاری)</label>
        <div className="flex gap-2">
          <input
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
            placeholder="مثلاً WELCOME10"
            className="field-input flex-1"
            dir="ltr"
          />
          <button onClick={applyDiscount} className="btn-outline whitespace-nowrap">
            اعمال کد
          </button>
        </div>
      </div>

      {discountAmount > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
          <span className="text-sm font-bold text-green-700">
            تخفیف اعمال‌شده {discountPercent ? `(${discountPercent}٪)` : ""}
          </span>
          <span className="text-sm font-extrabold text-green-700">
            -{toman(discountAmount)} تومان
          </span>
        </div>
      )}

      <div className="mb-4 rounded-2xl bg-purple-tint px-4 py-4 text-center">
        <span className="mb-1 block text-xs font-bold text-navy/70">مبلغ قابل پرداخت</span>
        <span className="block text-2xl font-extrabold text-purple-deep">
          {amount !== null ? `${toman(amount)} تومان` : "..."}
        </span>
      </div>

      <div className="card mb-4 flex items-center justify-between border-purple bg-purple-tint">
        <span className="text-sm font-bold text-navy">پرداخت امن با درگاه زرین‌پال</span>
        <span className="text-lg">🔒</span>
      </div>

      {error && <p className="mb-3 text-sm font-bold text-red-500">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => router.push(`/checkout/address?photoId=${photoId}`)}
          className="btn-outline flex-1"
        >
          بازگشت به مرحله قبل
        </button>
        <button onClick={pay} disabled={paying || !orderId} className="btn-primary flex-1">
          {paying ? "در حال پرداخت..." : "🔒 پرداخت و ثبت سفارش"}
        </button>
      </div>
    </div>
  );
}

export default function SummaryPage() {
  return (
    <Suspense fallback={null}>
      <SummaryPageInner />
    </Suspense>
  );
}

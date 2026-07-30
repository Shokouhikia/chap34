"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { printDraft } from "@/lib/draft";

const SIZE_LABEL: Record<string, string> = { "3x4": "۳×۴", "6x8": "۶×۸" };
const PAPER_LABEL: Record<string, string> = { glossy: "چاپ براق (گلاسه)", matte: "چاپ مات" };

const toman = (n: number) => n.toLocaleString("fa-IR");

export default function SummaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const photoId = searchParams.get("photoId") || "";

  const [orderId, setOrderId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draft = printDraft.get();

  useEffect(() => {
    if (!draft || !draft.phone) {
      router.push(`/checkout/address?photoId=${photoId}`);
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
       })
      .catch((err) => setError(err instanceof Error ? err.message : "خطای ناشناخته"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pay() {
    if (!orderId) return;
    setPaying(true);
    setError(null);
    try {
      const init = await api.initPayment(orderId);
      await api.confirmPayment(init.payment_id);
      router.push(`/orders/${orderId}/tracking`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "پرداخت ناموفق بود");
    } finally {
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
        <div className="price-box">
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
           <div className="price-row total">
             <span>مبلغ قابل پرداخت</span>
             <span>{amount !== null ? `${toman(amount)} تومان` : "..."}</span>
           </div>
        </div>
      )}

      <div className="card my-4 flex items-center justify-between border-purple bg-purple-tint">
        <span className="text-sm font-bold text-navy">درگاه بانک ملی (دمو)</span>
        <span className="h-4 w-4 rounded-full border-2 border-purple bg-purple" />
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

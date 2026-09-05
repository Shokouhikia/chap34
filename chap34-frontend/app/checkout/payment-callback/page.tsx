"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

function PaymentCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const orderId = searchParams.get("order_id");
    const authority = searchParams.get("Authority");
    const status = searchParams.get("Status");

    if (!orderId || !authority || !status) {
      setError("اطلاعات بازگشتی از درگاه پرداخت ناقص است.");
      return;
    }

    api
      .verifyPayment(orderId, authority, status)
      .then((res) => {
        if (res.payment_status === "success") {
          router.replace(`/orders/${orderId}/tracking`);
        } else {
          setError("پرداخت ناموفق بود یا توسط شما لغو شد.");
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "خطا در تأیید پرداخت"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <p className="mb-4 text-sm font-bold text-red-500">{error}</p>
        <button onClick={() => router.push("/account")} className="btn-outline">
          بازگشت به سفارشات من
        </button>
      </div>
    );
  }

  return <p className="text-center text-sm text-muted">در حال تأیید پرداخت...</p>;
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={null}>
      <PaymentCallbackInner />
    </Suspense>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, PaperType, PrintSize } from "@/lib/api";
import { printDraft } from "@/lib/draft";

const SIZES: { value: PrintSize; label: string; icon: string }[] = [
  { value: "3x4", label: "۳×۴", icon: "🪪" },
  { value: "6x8", label: "۶×۸", icon: "🖼️" },
];

const PAPERS: { value: PaperType; label: string; hint: string }[] = [
  { value: "glossy", label: "چاپ براق (گلاسه)", hint: "رنگ‌های شفاف‌تر و زنده‌تر" },
  { value: "matte", label: "چاپ مات", hint: "سطح مات و بدون بازتاب نور" },
];

const QUANTITIES = [6, 12, 24];

const toman = (n: number) => n.toLocaleString("fa-IR");

export default function PrintOptionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const photoId = searchParams.get("photoId") || "";

  const [size, setSize] = useState<PrintSize>("3x4");
  const [paperType, setPaperType] = useState<PaperType>("glossy");
  const [quantity, setQuantity] = useState(6);
  const [combinations, setCombinations] = useState<
    { quantity: number; size: PrintSize; paper_type: PaperType; price: number }[]
  >([]);

  useEffect(() => {
    api.getPricing().then((data) => setCombinations(data.combinations)).catch(() => {});
    const draft = printDraft.get();
    if (draft) {
      setSize(draft.size);
      setPaperType(draft.paperType);
      setQuantity(draft.quantity);
    }
  }, []);

  function priceFor(q: number) {
    const match = combinations.find(
      (c) => c.quantity === q && c.size === size && c.paper_type === paperType
    );
    return match?.price;
  }

  function continueNext() {
    printDraft.update({ size, quantity, paperType });
    router.push(`/checkout/address?photoId=${photoId}`);
  }

  return (
    <div className="mx-auto max-w-sm">
      <h2 className="mb-6 text-center text-xl font-extrabold text-navy">
        سایز، تعداد و نوع چاپ را انتخاب کنید
      </h2>

      <label className="mb-2 block text-xs font-bold text-navy">سایز چاپ</label>
      <div className="mb-5 space-y-2">
        {SIZES.map((s) => (
          <button
            key={s.value}
            onClick={() => setSize(s.value)}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold ${
              size === s.value ? "border-purple bg-purple-tint text-navy" : "border-line text-navy"
            }`}
          >
            <span className="text-lg">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      <label className="mb-2 block text-xs font-bold text-navy">تعداد</label>
      <div className="mb-5 space-y-2">
        {QUANTITIES.map((q) => (
          <button
            key={q}
            onClick={() => setQuantity(q)}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold ${
              quantity === q ? "border-purple bg-purple-tint text-navy" : "border-line text-navy"
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="text-lg">📦</span>
              {toman(q)} قطعه
            </span>
            <span className="text-purple-deep">
              {priceFor(q) !== undefined ? `${toman(priceFor(q)!)} ت` : "..."}
            </span>
          </button>
        ))}
      </div>

      <label className="mb-2 block text-xs font-bold text-navy">نوع کاغذ</label>
      <div className="mb-6 space-y-2">
        {PAPERS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPaperType(p.value)}
            className={`w-full rounded-xl border px-4 py-3 text-right text-sm font-bold ${
              paperType === p.value ? "border-purple bg-purple-tint text-navy" : "border-line text-navy"
            }`}
          >
            {p.label}
            <span className="mt-0.5 block text-xs font-normal text-muted">{p.hint}</span>
          </button>
        ))}
      </div>

      <div className="price-summary card mb-6 bg-purple-tint">
        <div className="flex justify-between text-sm font-bold text-navy">
          <span>مبلغ قابل پرداخت</span>
          <span>{priceFor(quantity) !== undefined ? `${toman(priceFor(quantity)!)} تومان` : "..."}</span>
        </div>
      </div>

      <button onClick={continueNext} className="btn-primary w-full">
        ادامه
      </button>
    </div>
  );
}

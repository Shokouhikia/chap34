"use client";

import { useEffect, useState } from "react";
import { panelApi } from "@/lib/panelApi";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    panelApi.listCustomers().then(setCustomers).catch(() => {});
  }, []);

  async function view(id: string) {
    const detail = await panelApi.getCustomerDetail(id);
    setSelected(detail);
  }

  if (selected) {
    return (
      <div className="card">
        <button onClick={() => setSelected(null)} className="btn-outline text-xs px-3 py-1.5 mb-4">← بازگشت به لیست مشتری‌ها</button>
        <h2 className="text-xl font-extrabold mb-1">{selected.user?.phone_number}</h2>
        <p className="text-xs text-muted mb-5">عضویت: {new Date(selected.user?.created_at).toLocaleDateString("fa-IR")}</p>

        <h3 className="font-extrabold mb-2 text-[14.5px]">سفارش‌ها ({selected.orders?.length})</h3>
        <div className="flex flex-col gap-1.5 mb-5">
          {selected.orders?.map((o: any) => (
            <div key={o.id} className="flex justify-between text-[13.5px] border-b border-line pb-1.5">
              <span className="font-mono2">{o.id.slice(0, 8)}</span>
              <span>{o.quantity} قطعه</span>
              <span className="font-mono2">{o.total_price?.toLocaleString("fa-IR")} ت</span>
              <span>{o.status}</span>
            </div>
          ))}
          {!selected.orders?.length && <p className="text-xs text-muted">سفارشی ندارد.</p>}
        </div>

        <h3 className="font-extrabold mb-2 text-[14.5px]">عکس‌ها ({selected.photos?.length})</h3>
        <div className="flex gap-3 flex-wrap">
          {selected.photos?.map((p: any) => (
            p.result_file_url
              ? <img key={p.id} src={panelApi.fileUrl(p.result_file_url)} alt="" className="w-20 h-24 object-cover rounded-md2 border border-line" />
              : <div key={p.id} className="w-20 h-24 rounded-md2 border border-line bg-purple-tint flex items-center justify-center text-xs text-muted">{p.status}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-xl font-extrabold mb-4">مشتری‌ها</h2>
      {customers.length === 0 ? (
        <p className="text-muted text-center py-10">هنوز مشتری‌ای ثبت‌نام نکرده.</p>
      ) : (
        <table className="w-full text-[13.5px]">
          <thead><tr className="text-muted text-xs"><th className="text-right py-2">موبایل</th><th className="text-right py-2">تعداد سفارش</th><th></th></tr></thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="py-2 font-mono2">{c.phone_number}</td>
                <td className="py-2">{c.order_count}</td>
                <td className="py-2"><button onClick={() => view(c.id)} className="btn-outline text-xs px-3 py-1.5">مشاهده حساب</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
